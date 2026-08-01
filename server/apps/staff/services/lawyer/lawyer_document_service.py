from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.documents.models import DocumentRequest, MatterDocumentReference
from apps.documents.services.workflow_service import DocumentWorkflowService
from apps.notifications.services import NotificationService


class LawyerDocumentService:
    @staticmethod
    def upload(user, data):
        cases = DocumentWorkflowService.accessible_cases_for_lawyer(user)
        try:
            case = cases.select_related("client").get(id=data.get("case_id"))
        except Exception as exc:
            raise ValidationError({"case_id": "Select one of your assigned matters."}) from exc
        return DocumentWorkflowService.upload(client=case.client, user=user, data=data)

    @staticmethod
    def workspace(user, params):
        cases = DocumentWorkflowService.accessible_cases_for_lawyer(user)
        documents, requests = DocumentWorkflowService.staff_workspace(cases, params)
        return {
            "documents": [DocumentWorkflowService.serialize_document(item) for item in documents],
            "requests": [DocumentWorkflowService.serialize_request(item) for item in requests],
            "cases": [{"id": str(item.id), "case_number": item.case_number, "title": item.title,
                       "client_id": str(item.client_id), "client_name": item.client.full_name}
                      for item in cases.select_related("client").order_by("-created_at")],
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
        return DocumentWorkflowService.serialize_request(item)

    @staticmethod
    def reference_document(user, data):
        cases = DocumentWorkflowService.accessible_cases_for_lawyer(user)
        try:
            case = cases.get(id=data.get("case_id"))
            document = case.client.documents.get(id=data.get("document_id"))
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
            raise ValidationError("Only a secretary-verified upload can be accepted or returned for replacement.")
        item.status = decision
        item.fulfilled_document.review_status = "ACCEPTED" if decision == "ACCEPTED" else "NEEDS_REPLACEMENT"
        item.fulfilled_document.review_notes = (data.get("notes") or "").strip()
        item.fulfilled_document.is_verified = decision == "ACCEPTED"
        item.fulfilled_document.save(update_fields=["review_status", "review_notes", "is_verified", "updated_at"])
        item.save(update_fields=["status", "updated_at"])
        if item.client.user_id:
            NotificationService.create(
                firm=item.firm, recipient=item.client.user, actor=user, case=item.case,
                title="Document accepted" if decision == "ACCEPTED" else "Replacement document required",
                message=f'"{item.title}" was accepted.' if decision == "ACCEPTED" else f'Please replace "{item.title}". {item.fulfilled_document.review_notes}'.strip(),
                action_url=f"/client/cases/{item.case_id}/documents",
                event_key=f"document-request-review:{item.id}:{decision}:{item.updated_at.isoformat()}",
            )
        return DocumentWorkflowService.serialize_request(item)
