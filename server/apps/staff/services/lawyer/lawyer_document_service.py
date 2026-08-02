from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.documents.models import DocumentRequest, MatterDocumentReference
from apps.documents.services.workflow_service import DocumentWorkflowService
from apps.notifications.services import NotificationService
from apps.cases.models import CaseAttachment, CaseAttachmentReferenceSequence


class LawyerDocumentService:
    @staticmethod
    def upload(user, data):
        cases = DocumentWorkflowService.accessible_cases_for_lawyer(user)
        try:
            case = cases.select_related("client").get(id=data.get("case_id"))
        except Exception as exc:
            raise ValidationError({"case_id": "Select one of your assigned matters."}) from exc
        mutable_data = data.copy()
        mutable_data["physical_copy_retained"] = True
        mutable_data["physical_storage_location"] = (
            mutable_data.get("physical_storage_location")
            or f"KYC DRAWER / {str(case.client_id)[:8].upper()}"
        )
        return DocumentWorkflowService.upload(client=case.client, user=user, data=mutable_data)

    @staticmethod
    def workspace(user, params):
        cases = DocumentWorkflowService.accessible_cases_for_lawyer(user)
        documents, requests = DocumentWorkflowService.staff_workspace(cases, params)
        scoped_cases = cases.filter(id=params.get("case_id")) if params.get("case_id") else cases
        referenced_documents = []
        if params.get("case_id"):
            referenced_documents = [
                reference.document
                for reference in MatterDocumentReference.objects.filter(
                    case__in=scoped_cases,
                    is_active=True,
                    document__archived_at__isnull=True,
                ).select_related("document", "document__client").prefetch_related(
                    "document__matter_references__case",
                    "document__receipt_items__receipt",
                ).order_by("created_at")
            ]
        return {
            "documents": [DocumentWorkflowService.serialize_document(item) for item in documents],
            "referenced_documents": [
                DocumentWorkflowService.serialize_document(item) for item in referenced_documents
            ],
            "requests": [DocumentWorkflowService.serialize_request(item) for item in requests],
            "cases": [{"id": str(item.id), "case_number": item.case_number, "title": item.title,
                       "client_id": str(item.client_id), "client_name": item.client.full_name,
                       "kyc_drawer_reference": item.client.kyc_drawer_reference}
                      for item in cases.select_related("client").order_by("-created_at")],
            "matter_documents": [{
                "id": str(item.id), "case_id": str(item.case_id),
                "document_reference": item.document_reference, "title": item.title,
                "attachment_type": item.attachment_type,
                "attachment_type_label": item.get_attachment_type_display(),
                "file_name": item.file_name,
                "physical_copy_type": item.physical_copy_type,
                "physical_copy_type_label": item.get_physical_copy_type_display(),
                "physical_storage_location": item.physical_storage_location,
                "document_date": item.document_date,
                "is_client_visible": item.is_client_visible,
                "version_count": item.versions.count(),
                "created_at": item.created_at,
            } for item in CaseAttachment.objects.filter(case__in=scoped_cases).prefetch_related("versions").order_by("-created_at")],
        }

    @staticmethod
    def create_request(user, data):
        cases = DocumentWorkflowService.accessible_cases_for_lawyer(user)
        try:
            case = cases.select_related("client", "firm").get(id=data.get("case_id"))
        except Exception as exc:
            raise ValidationError({"case_id": "Select one of your assigned matters."}) from exc
        title = (data.get("title") or "").strip()
        if not title:
            raise ValidationError({"title": "Describe the document required from the client."})
        item = DocumentRequest.objects.create(
            firm=case.firm, client=case.client, case=case, requested_by=user, title=title,
            document_type=data.get("document_type") or "OTHER",
            instructions=(data.get("instructions") or "").strip(), due_date=data.get("due_date") or None,
            status=DocumentRequest.Status.AWAITING_SECRETARY_DISPATCH,
        )
        DocumentWorkflowService.notify_secretaries_of_request(item, user)
        return DocumentWorkflowService.serialize_request(item)

    @staticmethod
    def reference_document(user, data):
        cases = DocumentWorkflowService.accessible_cases_for_lawyer(user)
        try:
            case = cases.get(id=data.get("case_id"))
            document = case.client.documents.get(
                id=data.get("document_id"), firm=case.firm, archived_at__isnull=True
            )
        except Exception as exc:
            raise ValidationError("The document and matter must belong to the same assigned client file.") from exc
        reference, created = MatterDocumentReference.objects.get_or_create(
            case=case, document=document,
            defaults={"purpose": data.get("purpose") or "OTHER", "notes": data.get("notes") or "", "referenced_by": user},
        )
        if not created:
            reference.purpose = data.get("purpose") or reference.purpose
            reference.notes = data.get("notes") or reference.notes
            reference.save(update_fields=["purpose", "notes", "updated_at"])
        return DocumentWorkflowService.serialize_document(document)

    @staticmethod
    @transaction.atomic
    def create_matter_document(user, data):
        cases = DocumentWorkflowService.accessible_cases_for_lawyer(user)
        try:
            case = cases.select_for_update().get(id=data.get("case_id"))
        except Exception as exc:
            raise ValidationError({"case_id": "Select one of your assigned matters."}) from exc
        title = (data.get("title") or "").strip()
        if not title:
            raise ValidationError({"title": "Record the matter document title."})
        physical_storage_location = (data.get("physical_storage_location") or "").strip()
        if not physical_storage_location:
            raise ValidationError({"physical_storage_location": "Record where the physical matter document is filed."})
        sequence, _ = CaseAttachmentReferenceSequence.objects.get_or_create(case=case)
        sequence = CaseAttachmentReferenceSequence.objects.select_for_update().get(case=case)
        while True:
            reference = f"{case.case_number}/D{sequence.next_number:03d}"
            sequence.next_number += 1
            sequence.save(update_fields=["next_number", "updated_at"])
            if not CaseAttachment.objects.filter(case=case, document_reference=reference).exists():
                break
        attachment = CaseAttachment.objects.create(
            case=case, document_reference=reference,
            attachment_type=data.get("attachment_type") or CaseAttachment.AttachmentType.OTHER,
            title=title, description=(data.get("description") or "").strip(),
            physical_copy_type=data.get("physical_copy_type") or CaseAttachment.PhysicalCopyType.OFFICE_COPY,
            physical_storage_location=physical_storage_location,
            document_date=data.get("document_date") or None,
            uploaded_by=user,
            is_client_visible=str(data.get("is_client_visible", "")).lower() in {"true", "1", "yes", "on"},
            is_confidential=str(data.get("is_confidential", "true")).lower() in {"true", "1", "yes", "on"},
        )
        return {
            "id": str(attachment.id), "document_reference": attachment.document_reference,
            "title": attachment.title, "attachment_type": attachment.attachment_type,
            "physical_storage_location": attachment.physical_storage_location,
        }

    @staticmethod
    def review_request(user, request_id, data):
        cases = DocumentWorkflowService.accessible_cases_for_lawyer(user)
        try:
            item = DocumentRequest.objects.select_related("fulfilled_document", "case", "client").get(
                id=request_id, case__in=cases
            )
        except DocumentRequest.DoesNotExist as exc:
            raise PermissionDenied("Document request was not found.") from exc
        decision = data.get("decision")
        if decision not in {"ACCEPTED", "REPLACEMENT_REQUIRED"} or not item.fulfilled_document_id or item.status != DocumentRequest.Status.UPLOADED:
            raise ValidationError("Only a secretary-registered document can be accepted or returned for replacement.")
        item.status = (
            DocumentRequest.Status.ACCEPTED
            if decision == "ACCEPTED"
            else DocumentRequest.Status.AWAITING_SECRETARY_DISPATCH
        )
        item.fulfilled_document.review_status = "ACCEPTED" if decision == "ACCEPTED" else "NEEDS_REPLACEMENT"
        item.fulfilled_document.review_notes = (data.get("notes") or "").strip()
        item.fulfilled_document.is_verified = decision == "ACCEPTED"
        item.fulfilled_document.verification_status = (
            item.fulfilled_document.VerificationStatus.VERIFIED
            if decision == "ACCEPTED" else item.fulfilled_document.VerificationStatus.FAILED
        )
        item.fulfilled_document.verified_by = user if decision == "ACCEPTED" else None
        item.fulfilled_document.verified_at = timezone.now() if decision == "ACCEPTED" else None
        item.fulfilled_document.save(update_fields=[
            "review_status", "review_notes", "is_verified", "verification_status",
            "verified_by", "verified_at", "updated_at"
        ])
        item.save(update_fields=["status", "updated_at"])
        if decision == "REPLACEMENT_REQUIRED":
            DocumentWorkflowService.notify_secretaries_of_request(item, user, replacement=True)
        elif item.client.user_id:
            NotificationService.create(
                firm=item.firm, recipient=item.client.user, actor=user, case=item.case,
                title="Document accepted",
                message=f'"{item.title}" was accepted.',
                action_url=f"/client/cases/{item.case_id}/documents",
                event_key=f"document-request-review:{item.id}:{decision}:{item.updated_at.isoformat()}",
            )
        return DocumentWorkflowService.serialize_request(item)
