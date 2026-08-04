from datetime import datetime, time

from django.db import transaction
from django.core.files.base import ContentFile
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.billing.models import Disbursement, Invoice, LedgerTransaction, MatterClientLedger
from apps.audit_logs.services import AuditService
from apps.cases.models import ArchiveAccessLog, Case, DestructionLog, GeneratedClosingDocument, MatterArchive, MatterClosure, RetentionReview
from apps.clients.models import ClientDocument
from apps.documents.models import MatterDocumentReference
from apps.cases.services.case_service import CaseService
from apps.common.choices import UserRole
from apps.staff.models import AccountantPermission, LawyerPermission


class GovernanceAccess:
    @staticmethod
    def firm(user):
        return CaseService.get_user_firm(user)

    @classmethod
    def require_lawyer(cls, user, code):
        firm = cls.firm(user)
        if user.role == UserRole.ADMIN and firm.owner_id == user.id:
            return firm
        lawyer = getattr(user, "lawyer_profile", None)
        if not lawyer or lawyer.law_firm_id != firm.id or not lawyer.is_active or not lawyer.has_permission(code):
            raise PermissionDenied(f"Permission {code} is required.")
        return firm

    @classmethod
    def require_finance(cls, user):
        firm = cls.firm(user)
        if user.role == UserRole.ADMIN and firm.owner_id == user.id:
            return firm
        accountant = getattr(user, "accountant_profile", None)
        if not accountant or accountant.law_firm_id != firm.id or not accountant.is_active or not accountant.has_permission(AccountantPermission.RECONCILE_ACCOUNTS):
            raise PermissionDenied("Financial-clearance permission is required.")
        return firm


class MatterClosureService:
    @classmethod
    @transaction.atomic
    def request(cls, *, user, matter_id, data):
        firm = GovernanceAccess.require_lawyer(user, LawyerPermission.REQUEST_MATTER_CLOSURE)
        matter = Case.objects.select_for_update().get(id=matter_id, firm=firm)
        if matter.matter_status in {Case.MatterStatus.CLOSED, Case.MatterStatus.ARCHIVED}:
            raise ValidationError({"matter": "A closed or archived matter cannot receive a new closure request."})
        if MatterClosure.objects.filter(matter=matter, status__in=[MatterClosure.Status.DRAFT, MatterClosure.Status.PENDING_APPROVAL, MatterClosure.Status.CLOSED]).exists():
            raise ValidationError({"matter": "This matter already has a live closure record."})
        closure = MatterClosure(firm=firm, matter=matter, requested_by=user, **data)
        closure.full_clean()
        closure.save()
        matter.matter_status = Case.MatterStatus.CLOSURE_PENDING
        matter.save(update_fields=["matter_status", "updated_at"])
        AuditService.record(firm=firm, user=user, action="MATTER_CLOSURE_REQUESTED", obj=closure, new={"status": closure.status, "proposed_closure_date": closure.proposed_closure_date}, reason=closure.closure_reason)
        return closure

    @staticmethod
    def blocking_reasons(closure):
        matter = closure.matter
        reasons = []
        required = {
            "legal_work_complete": "Legal work is not marked complete.",
            "result_document_recorded": "The result, order, settlement or completion document is not recorded.",
            "client_instructions_complete": "Client instructions remain incomplete.",
            "undertakings_resolved": "Undertakings are not discharged or transferred.",
            "final_invoice_issued": "The final invoice or fee note has not been issued.",
            "final_client_account_prepared": "The final client account has not been prepared.",
            "closing_letter_prepared": "The closing letter has not been prepared.",
            "client_informed": "The client has not been informed of remaining obligations.",
        }
        reasons.extend(message for field, message in required.items() if not getattr(closure, field))
        if matter.tasks.exclude(status__in=["DONE", "CANCELLED"]).exists():
            reasons.append("Active or unresolved tasks remain.")
        if matter.deadlines.filter(status="OPEN").exists():
            reasons.append("Open critical deadlines remain unresolved.")
        if matter.events.filter(starts_at__gte=timezone.now()).exclude(
            status__in=["COMPLETED", "CONCLUDED", "CANCELLED", "VACATED", "TAKEN_OUT"]
        ).exists():
            reasons.append("Future or unresolved matter events remain.")
        ledger = MatterClientLedger.objects.filter(matter=matter).first()
        if ledger and ledger.cleared_balance != 0:
            reasons.append("The matter client-money balance is not zero.")
        if Invoice.objects.filter(matter=matter).exclude(status__in=[Invoice.Status.PAID, Invoice.Status.CANCELLED, Invoice.Status.CREDITED]).exists():
            reasons.append("Invoices remain financially unresolved.")
        unresolved_originals = matter.document_references.filter(
            is_active=True, document__return_required=True, document__physical_copy_retained=True
        ).exists()
        if unresolved_originals and not closure.authorised_original_retention_reason.strip():
            reasons.append("Original client documents remain unresolved without an authorised retention reason.")
        if not closure.appeal_position.strip():
            reasons.append("The appeal or review position is not recorded.")
        if not closure.enforcement_position.strip():
            reasons.append("The enforcement position is not recorded.")
        if not closure.responsible_advocate_approved_by_id:
            reasons.append("Responsible-advocate approval is missing.")
        if not closure.finance_approved_by_id:
            reasons.append("Finance approval is missing.")
        if not closure.administrative_approved_by_id:
            reasons.append("Administrative approval is missing.")
        generated_types = set(closure.generated_documents.values_list("document_type", flat=True))
        if GeneratedClosingDocument.Type.CLOSING_LETTER not in generated_types:
            reasons.append("A versioned closing letter has not been generated in the matter document register.")
        if GeneratedClosingDocument.Type.FINAL_CLIENT_STATEMENT not in generated_types:
            reasons.append("A versioned final client statement has not been generated in the matter document register.")
        return reasons

    @classmethod
    @transaction.atomic
    def generate_document(cls, *, user, closure_id, document_type):
        firm = GovernanceAccess.require_lawyer(user, LawyerPermission.REQUEST_MATTER_CLOSURE)
        closure = MatterClosure.objects.select_for_update().select_related("matter", "matter__client").get(id=closure_id, firm=firm)
        if document_type not in GeneratedClosingDocument.Type.values:
            raise ValidationError({"document_type": "Select a supported closing document type."})
        matter = closure.matter
        version = closure.generated_documents.filter(document_type=document_type).count() + 1
        invoices = Invoice.objects.filter(matter=matter)
        ledger = MatterClientLedger.objects.filter(matter=matter).first()
        entries = LedgerTransaction.objects.filter(matter=matter)
        money = lambda queryset: queryset.aggregate(total=Sum("amount"))["total"] or 0
        if document_type == GeneratedClosingDocument.Type.FINAL_CLIENT_STATEMENT:
            snapshot = {
                "matter_title": matter.title,
                "internal_matter_number": matter.case_number,
                "fees_invoiced": invoices.aggregate(total=Sum("professional_fees"))["total"] or 0,
                "invoice_total": invoices.aggregate(total=Sum("total_amount"))["total"] or 0,
                "payments_received": invoices.aggregate(total=Sum("amount_paid"))["total"] or 0,
                "disbursements": Disbursement.objects.filter(matter=matter).aggregate(total=Sum("amount"))["total"] or 0,
                "client_money_received": money(entries.filter(transaction_type=LedgerTransaction.TransactionType.CLIENT_RECEIPT, direction=LedgerTransaction.Direction.CREDIT)),
                "client_money_paid": money(entries.filter(transaction_type=LedgerTransaction.TransactionType.CLIENT_PAYMENT, direction=LedgerTransaction.Direction.DEBIT)),
                "transfers_authorised": money(entries.filter(transaction_type=LedgerTransaction.TransactionType.TRANSFER_TO_OFFICE, direction=LedgerTransaction.Direction.DEBIT)),
                "balance_returned": money(entries.filter(transaction_type=LedgerTransaction.TransactionType.CLIENT_PAYMENT, direction=LedgerTransaction.Direction.DEBIT)),
                "remaining_authorised_balance": ledger.cleared_balance if ledger else 0,
                "final_ledger_balance": ledger.cleared_balance if ledger else 0,
            }
            title = "Final Client Statement"
            body = "\n".join(f"{key.replace('_', ' ').title()}: {value}" for key, value in snapshot.items())
        else:
            references = matter.document_references.filter(is_active=True).select_related("document")
            returned = [ref.document.title for ref in references if ref.document.return_required and not ref.document.physical_copy_retained]
            retained = [{"title": ref.document.title, "reason": closure.authorised_original_retention_reason} for ref in references if ref.document.physical_copy_retained]
            snapshot = {
                "matter_title": matter.title, "internal_matter_number": matter.case_number,
                "external_reference": matter.official_court_case_number or matter.cts_reference,
                "work_completed": closure.closing_summary, "final_result": closure.outcome,
                "documents_returned": returned, "documents_retained": retained,
                "financial_position": closure.financial_clearance_status,
                "remaining_deadlines": list(matter.deadlines.filter(status="OPEN").values("deadline_type", "due_at", "description")),
                "future_actions": closure.post_closure_responsibilities,
                "person_responsible": getattr(matter.assigned_lawyer, "user", None).full_name if matter.assigned_lawyer_id else "Not recorded",
                "appeal_review_position": closure.appeal_position,
                "enforcement_position": closure.enforcement_position,
                "archive_retention_notice": "The file will be archived and reviewed under the firm's applicable retention policy.",
            }
            title = "Closing Letter"
            body = "\n".join(f"{key.replace('_', ' ').title()}: {value}" for key, value in snapshot.items())
        reference = f"{matter.case_number}/{document_type}/V{version}"
        document = ClientDocument(
            firm=firm, client=matter.client, created_by=user, uploaded_by=user,
            title=f"{title} v{version}", document_type="FINANCIAL" if document_type == GeneratedClosingDocument.Type.FINAL_CLIENT_STATEMENT else "LEGAL",
            reference=reference, classification=ClientDocument.Classification.MATTER_SPECIFIC,
            category=ClientDocument.Category.CORRESPONDENCE if document_type == GeneratedClosingDocument.Type.CLOSING_LETTER else ClientDocument.Category.TRANSACTION,
            subtype=ClientDocument.Subtype.OTHER, source_copy_type=ClientDocument.SourceCopyType.OFFICIAL_ELECTRONIC,
            digital_copy_available=True, review_status=ClientDocument.ReviewStatus.ACCEPTED,
        )
        document.file.save(f"{reference.replace('/', '_')}.txt", ContentFile(body.encode("utf-8")), save=False)
        document.full_clean()
        document.save()
        link = MatterDocumentReference(case=matter, document=document, purpose=MatterDocumentReference.Purpose.CORRESPONDENCE, referenced_by=user)
        link.full_clean()
        link.save()
        generated = GeneratedClosingDocument.objects.create(
            firm=firm, matter=matter, closure=closure, document_type=document_type, version=version,
            client_document=document, content_snapshot=snapshot, generated_by=user,
        )
        update_fields = ["updated_at"]
        if document_type == GeneratedClosingDocument.Type.CLOSING_LETTER:
            closure.closing_letter_prepared = True
            update_fields.append("closing_letter_prepared")
        else:
            closure.final_client_account_prepared = True
            update_fields.append("final_client_account_prepared")
        closure.save(update_fields=update_fields)
        AuditService.record(firm=firm, user=user, action=f"{document_type}_GENERATED", obj=generated, new={"version": version, "client_document": document.id})
        return generated

    @classmethod
    @transaction.atomic
    def approve_advocate(cls, *, user, closure_id):
        firm = GovernanceAccess.require_lawyer(user, LawyerPermission.APPROVE_MATTER_CLOSURE)
        closure = MatterClosure.objects.select_for_update().get(id=closure_id, firm=firm)
        closure.responsible_advocate_approved_by = user
        closure.status = MatterClosure.Status.PENDING_APPROVAL
        closure.save(update_fields=["responsible_advocate_approved_by", "status", "updated_at"])
        AuditService.record(firm=firm, user=user, action="MATTER_CLOSURE_ADVOCATE_APPROVED", obj=closure, new={"status": closure.status, "approved_by": user.id})
        return closure

    @classmethod
    @transaction.atomic
    def approve_finance(cls, *, user, closure_id):
        firm = GovernanceAccess.require_finance(user)
        closure = MatterClosure.objects.select_for_update().get(id=closure_id, firm=firm)
        ledger = MatterClientLedger.objects.select_for_update().filter(matter=closure.matter).first()
        if ledger and ledger.cleared_balance != 0:
            raise ValidationError({"client_money": "Finance cannot approve while the client-money balance is non-zero."})
        closure.finance_approved_by = user
        closure.financial_clearance_status = "CLEARED"
        closure.save(update_fields=["finance_approved_by", "financial_clearance_status", "updated_at"])
        AuditService.record(firm=firm, user=user, action="MATTER_CLOSURE_FINANCE_APPROVED", obj=closure, new={"financial_clearance_status": closure.financial_clearance_status, "approved_by": user.id})
        return closure

    @classmethod
    @transaction.atomic
    def finalise(cls, *, user, closure_id):
        firm = GovernanceAccess.require_lawyer(user, LawyerPermission.APPROVE_MATTER_CLOSURE)
        closure = MatterClosure.objects.select_for_update().select_related("matter").get(id=closure_id, firm=firm)
        closure.administrative_approved_by = user
        closure.save(update_fields=["administrative_approved_by", "updated_at"])
        reasons = cls.blocking_reasons(closure)
        if reasons:
            raise ValidationError({"closure": reasons})
        closure.status = MatterClosure.Status.CLOSED
        closure.final_closure_date = timezone.now()
        closure.save(update_fields=["status", "final_closure_date", "updated_at"])
        matter = closure.matter
        matter.matter_status = Case.MatterStatus.CLOSED
        matter.status = Case.Status.CLOSED
        matter.is_active = False
        matter.closed_at = closure.final_closure_date
        matter.save(update_fields=["matter_status", "status", "is_active", "closed_at", "updated_at"])
        AuditService.record(firm=firm, user=user, action="MATTER_CLOSED", obj=matter, previous={"matter_status": Case.MatterStatus.CLOSURE_PENDING}, new={"matter_status": matter.matter_status, "closure": closure.id})
        return closure

    @classmethod
    @transaction.atomic
    def reopen(cls, *, user, closure_id, reason):
        firm = GovernanceAccess.require_lawyer(user, LawyerPermission.REOPEN_MATTER)
        if not reason.strip():
            raise ValidationError({"reason": "A reopening reason is required."})
        closure = MatterClosure.objects.select_for_update().select_related("matter").get(id=closure_id, firm=firm, status=MatterClosure.Status.CLOSED)
        if hasattr(closure.matter, "archive"):
            raise ValidationError({"matter": "An archived matter must first undergo an authorised post-archive process."})
        closure.status = MatterClosure.Status.REOPENED
        closure.reopening_reason = reason
        closure.reopened_by = user
        closure.reopened_at = timezone.now()
        closure.save(update_fields=["status", "reopening_reason", "reopened_by", "reopened_at", "updated_at"])
        matter = closure.matter
        matter.matter_status = Case.MatterStatus.ACTIVE
        matter.status = Case.Status.IN_PROGRESS
        matter.is_active = True
        matter.save(update_fields=["matter_status", "status", "is_active", "updated_at"])
        AuditService.record(firm=firm, user=user, action="MATTER_REOPENED", obj=matter, previous={"matter_status": Case.MatterStatus.CLOSED}, new={"matter_status": matter.matter_status, "closure": closure.id}, reason=reason)
        return closure


class ArchiveService:
    @classmethod
    @transaction.atomic
    def access(cls, *, user, archive_id, purpose):
        firm = GovernanceAccess.require_lawyer(user, LawyerPermission.ACCESS_RESTRICTED_ARCHIVE)
        if not purpose.strip():
            raise ValidationError({"purpose": "An archive-access purpose is required."})
        archive = MatterArchive.objects.select_for_update().get(id=archive_id, firm=firm)
        access = ArchiveAccessLog.objects.create(archive=archive, user=user, purpose=purpose)
        AuditService.record(firm=firm, user=user, action="ARCHIVE_ACCESSED", obj=archive, new={"access_log": access.id}, reason=purpose)
        return archive, access

    @classmethod
    @transaction.atomic
    def legal_hold(cls, *, user, archive_id, action, reason, authority):
        firm = GovernanceAccess.require_lawyer(user, LawyerPermission.PLACE_LEGAL_HOLD)
        if not reason.strip() or not authority.strip():
            raise ValidationError({"legal_hold": "Reason and authority are required."})
        archive = MatterArchive.objects.select_for_update().get(id=archive_id, firm=firm)
        previous = {"legal_hold": archive.legal_hold, "legal_hold_reason": archive.legal_hold_reason,
                    "legal_hold_authority": archive.legal_hold_authority}
        if action == "PLACE":
            if archive.legal_hold:
                raise ValidationError({"legal_hold": "This archive is already on legal hold."})
            archive.legal_hold = True
            archive.legal_hold_reason = reason
            archive.legal_hold_authority = authority
            audit_action = "LEGAL_HOLD_PLACED"
        else:
            if not archive.legal_hold:
                raise ValidationError({"legal_hold": "This archive is not on legal hold."})
            archive.legal_hold = False
            archive.legal_hold_reason = f"Released: {reason}"
            archive.legal_hold_authority = authority
            audit_action = "LEGAL_HOLD_RELEASED"
        archive.save(update_fields=["legal_hold", "legal_hold_reason", "legal_hold_authority", "updated_at"])
        AuditService.record(firm=firm, user=user, action=audit_action, obj=archive, previous=previous,
                            new={"legal_hold": archive.legal_hold, "authority": authority}, reason=reason)
        return archive

    @classmethod
    @transaction.atomic
    def archive(cls, *, user, matter_id, data):
        firm = GovernanceAccess.require_lawyer(user, LawyerPermission.ARCHIVE_MATTER)
        matter = Case.objects.select_for_update().get(id=matter_id, firm=firm)
        if matter.matter_status != Case.MatterStatus.CLOSED:
            raise ValidationError({"matter": "Only a formally closed matter may be archived."})
        archive = MatterArchive(firm=firm, matter=matter, approved_by=user, **data)
        archive.full_clean()
        archive.save()
        matter.matter_status = Case.MatterStatus.ARCHIVED
        matter.status = Case.Status.ARCHIVED
        matter.is_active = False
        matter.save(update_fields=["matter_status", "status", "is_active", "updated_at"])
        AuditService.record(firm=firm, user=user, action="MATTER_ARCHIVED", obj=archive, new={"archive_reference": archive.archive_reference, "scheduled_review_date": archive.scheduled_review_date})
        return archive

    @classmethod
    @transaction.atomic
    def retention_review(cls, *, user, archive_id, data):
        firm = GovernanceAccess.require_lawyer(user, LawyerPermission.APPROVE_DESTRUCTION)
        archive = MatterArchive.objects.select_for_update().get(id=archive_id, firm=firm)
        outcome = data["outcome"]
        if outcome == RetentionReview.Outcome.APPROVE_DESTRUCTION and (archive.legal_hold or archive.permanent_preservation):
            raise ValidationError({"outcome": "Legal hold or permanent preservation prevents destruction approval."})
        review = RetentionReview.objects.create(archive=archive, reviewed_by=user, approved_by=user, approved_at=timezone.now(), **data)
        if outcome == RetentionReview.Outcome.LEGAL_HOLD:
            archive.legal_hold = True
            archive.legal_hold_reason = data["reason"]
            archive.legal_hold_authority = user.full_name
        elif outcome == RetentionReview.Outcome.PERMANENT_PRESERVATION:
            archive.permanent_preservation = True
        elif data.get("next_review_date"):
            archive.scheduled_review_date = data["next_review_date"]
        archive.save()
        AuditService.record(firm=firm, user=user, action="RETENTION_REVIEW_APPROVED", obj=review, new={"outcome": review.outcome, "next_review_date": review.next_review_date}, reason=review.reason)
        return review

    @classmethod
    @transaction.atomic
    def destroy(cls, *, user, archive_id, data):
        firm = GovernanceAccess.require_lawyer(user, LawyerPermission.APPROVE_DESTRUCTION)
        archive = MatterArchive.objects.select_for_update().select_related("matter").get(id=archive_id, firm=firm)
        if archive.legal_hold or archive.permanent_preservation:
            raise ValidationError({"archive": "A legal hold or permanent-preservation decision prevents destruction."})
        if not archive.retention_reviews.filter(outcome=RetentionReview.Outcome.APPROVE_DESTRUCTION).exists():
            raise ValidationError({"archive": "An approved retention review is required before destruction."})
        if hasattr(archive, "destruction_log"):
            raise ValidationError({"archive": "Destruction has already been recorded."})
        approved_ids = {str(value) for value in data.get("records_approved", [])}
        excluded_ids = {str(value) for value in data.get("records_excluded", [])}
        document_ids = MatterDocumentReference.objects.filter(
            case=archive.matter, is_active=True
        ).values_list("document_id", flat=True)
        documents = list(ClientDocument.objects.select_for_update().filter(id__in=document_ids))
        available_ids = {str(document.id) for document in documents}
        if not approved_ids or not approved_ids.issubset(available_ids):
            raise ValidationError({"records_approved": "List valid matter document identifiers approved for destruction."})
        if approved_ids & excluded_ids:
            raise ValidationError({"records_excluded": "A record cannot be both approved and excluded."})
        unresolved_originals = [
            document for document in documents
            if str(document.id) in approved_ids and document.physical_copy_retained
        ]
        if unresolved_originals:
            raise ValidationError({"records_approved": "Physically retained originals must be returned or excluded from destruction."})
        record = DestructionLog.objects.create(
            firm=firm, archive=archive, matter_reference=archive.matter.case_number,
            approval_authority=user, **data,
        )
        destroyed_at = timezone.make_aware(datetime.combine(record.destruction_date, time.min))
        for document in documents:
            if str(document.id) not in approved_ids:
                continue
            if document.file:
                document.file.delete(save=False)
            document.file = ""
            document.description = ""
            document.document_identifier = ""
            document.custody_notes = "Content securely destroyed; proof retained in destruction log."
            document.content_destroyed_at = destroyed_at
            document.destruction_log = record
            document.save(update_fields=[
                "file", "description", "document_identifier", "custody_notes",
                "content_destroyed_at", "destruction_log", "updated_at",
            ])
        AuditService.record(firm=firm, user=user, action="SECURE_DESTRUCTION_RECORDED", obj=record, new={"destruction_date": record.destruction_date, "method": record.method, "records_approved": record.records_approved})
        return record
