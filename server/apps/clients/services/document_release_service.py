from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.audit_logs.services import AuditService
from apps.cases.models import Case
from apps.cases.services.case_service import CaseService
from apps.clients.models import ClientDocument, ClientDocumentCustodyMovement, DocumentReleaseRequest
from apps.common.choices import UserRole
from apps.documents.models import MatterDocumentReference
from apps.staff.models import LawyerPermission, SecretaryPermission


class DocumentReleaseService:
    @staticmethod
    def _firm(user):
        return CaseService.get_user_firm(user)

    @classmethod
    def _owner(cls, user, firm):
        return user.role == UserRole.ADMIN and firm.owner_id == user.id

    @classmethod
    def _can_manage(cls, user, firm):
        if cls._owner(user, firm):
            return True
        lawyer = getattr(user, "lawyer_profile", None)
        if lawyer and lawyer.law_firm_id == firm.id and lawyer.is_active:
            return lawyer.has_permission(LawyerPermission.MANAGE_CASE_DOCUMENTS)
        secretary = getattr(user, "secretary_profile", None)
        return bool(secretary and secretary.law_firm_id == firm.id and secretary.is_active and
                    secretary.has_permission(SecretaryPermission.MANAGE_DOCUMENTS))

    @classmethod
    def _can_approve(cls, user, firm):
        if cls._owner(user, firm):
            return True
        lawyer = getattr(user, "lawyer_profile", None)
        return bool(lawyer and lawyer.law_firm_id == firm.id and lawyer.is_active and
                    lawyer.has_permission(LawyerPermission.APPROVE_DOCUMENTS))

    @classmethod
    def _objects(cls, user, client_id, document_id, matter_id):
        firm = cls._firm(user)
        document = ClientDocument.objects.select_for_update().get(
            id=document_id, client_id=client_id, firm=firm
        )
        matter = Case.objects.select_for_update().get(id=matter_id, client_id=client_id, firm=firm)
        if not MatterDocumentReference.objects.filter(case=matter, document=document, is_active=True).exists():
            raise ValidationError({"document": "The document is not in this matter's active register."})
        return firm, document, matter

    @classmethod
    @transaction.atomic
    def request(cls, *, user, client_id, document_id, matter_id, purpose, proposed_recipient):
        firm, document, matter = cls._objects(user, client_id, document_id, matter_id)
        if not cls._can_manage(user, firm):
            raise PermissionDenied("Document-custody permission is required.")
        if not document.physical_copy_retained:
            raise ValidationError({"document": "No physical original is recorded as held by the firm."})
        record = DocumentReleaseRequest.objects.create(
            firm=firm, document=document, matter=matter, requested_by=user,
            purpose=purpose.strip(), proposed_recipient=proposed_recipient.strip(),
        )
        AuditService.record(firm=firm, user=user, action="DOCUMENT_RELEASE_REQUESTED", obj=record,
                            new={"document": document.id, "matter": matter.id,
                                 "proposed_recipient": record.proposed_recipient}, reason=record.purpose)
        return record

    @classmethod
    @transaction.atomic
    def decide(cls, *, user, release_id, approve, reason):
        firm = cls._firm(user)
        if not cls._can_approve(user, firm):
            raise PermissionDenied("Document-release approval permission is required.")
        record = DocumentReleaseRequest.objects.select_for_update().get(id=release_id, firm=firm)
        if record.status != record.Status.REQUESTED:
            raise ValidationError({"status": "Only a pending request may be decided."})
        if record.requested_by_id == user.id:
            raise PermissionDenied("The release requester cannot approve their own request.")
        if not reason.strip():
            raise ValidationError({"reason": "Record the approval or rejection reason."})
        previous = {"status": record.status}
        if approve:
            record.status = record.Status.APPROVED
            record.approved_by = user
            record.approved_at = timezone.now()
            record.approval_reason = reason.strip()
            action = "DOCUMENT_RELEASE_APPROVED"
        else:
            record.status = record.Status.REJECTED
            record.rejection_reason = reason.strip()
            action = "DOCUMENT_RELEASE_REJECTED"
        record.save()
        AuditService.record(firm=firm, user=user, action=action, obj=record, previous=previous,
                            new={"status": record.status}, reason=reason)
        return record

    @classmethod
    @transaction.atomic
    def release(cls, *, user, release_id, released_to, recipient_identification,
                recipient_acknowledgement, acknowledgement_document=None):
        firm = cls._firm(user)
        if not cls._can_manage(user, firm):
            raise PermissionDenied("Document-custody permission is required.")
        record = DocumentReleaseRequest.objects.select_for_update().select_related(
            "document", "matter"
        ).get(id=release_id, firm=firm)
        if record.status != record.Status.APPROVED:
            raise ValidationError({"status": "The release must first be independently approved."})
        if acknowledgement_document and (
            acknowledgement_document.firm_id != firm.id or
            acknowledgement_document.client_id != record.document.client_id
        ):
            raise ValidationError({"acknowledgement_document": "Select a document for the same firm and client."})
        now = timezone.now()
        ClientDocumentCustodyMovement.objects.create(
            document=record.document,
            from_location_or_custodian=record.document.physical_storage_location,
            to_location_or_custodian=released_to.strip(),
            movement_type=ClientDocumentCustodyMovement.MovementType.RELEASE,
            released_by=user, received_by=user, moved_at=now,
            purpose=record.purpose,
            notes=f"Recipient identification: {recipient_identification.strip()}",
        )
        document = record.document
        document.physical_copy_retained = False
        document.physical_storage_location = ""
        document.custody_notes = f"Released under request {record.id} on {now.isoformat()}."
        document.save(update_fields=["physical_copy_retained", "physical_storage_location", "custody_notes", "updated_at"])
        record.status = record.Status.RELEASED
        record.released_by = user
        record.released_to = released_to.strip()
        record.recipient_identification = recipient_identification.strip()
        record.released_at = now
        record.recipient_acknowledgement = recipient_acknowledgement.strip()
        record.acknowledgement_document = acknowledgement_document
        record.save()
        AuditService.record(firm=firm, user=user, action="ORIGINAL_DOCUMENT_RELEASED", obj=record,
                            previous={"status": record.Status.APPROVED},
                            new={"status": record.status, "released_to": record.released_to,
                                 "recipient_identification": record.recipient_identification})
        return record
