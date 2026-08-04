from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.billing.models import Invoice, MatterClientLedger
from apps.cases.models import Case, DestructionLog, MatterArchive, MatterClosure, RetentionReview
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
        return reasons

    @classmethod
    @transaction.atomic
    def approve_advocate(cls, *, user, closure_id):
        firm = GovernanceAccess.require_lawyer(user, LawyerPermission.APPROVE_MATTER_CLOSURE)
        closure = MatterClosure.objects.select_for_update().get(id=closure_id, firm=firm)
        closure.responsible_advocate_approved_by = user
        closure.status = MatterClosure.Status.PENDING_APPROVAL
        closure.save(update_fields=["responsible_advocate_approved_by", "status", "updated_at"])
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
        matter.is_active = False
        matter.closed_at = closure.final_closure_date
        matter.save(update_fields=["matter_status", "is_active", "closed_at", "updated_at"])
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
        matter.is_active = True
        matter.save(update_fields=["matter_status", "is_active", "updated_at"])
        return closure


class ArchiveService:
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
        matter.is_active = False
        matter.save(update_fields=["matter_status", "is_active", "updated_at"])
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
        return DestructionLog.objects.create(
            firm=firm, archive=archive, matter_reference=archive.matter.case_number,
            approval_authority=user, **data,
        )
