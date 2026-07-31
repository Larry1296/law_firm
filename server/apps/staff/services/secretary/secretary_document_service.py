from rest_framework.exceptions import ValidationError

from apps.documents.services.workflow_service import DocumentWorkflowService


class SecretaryDocumentService:
    @staticmethod
    def workspace(user, params):
        cases = DocumentWorkflowService.accessible_cases_for_secretary(user)
        documents, requests = DocumentWorkflowService.staff_workspace(cases, params)
        return {
            "documents": [DocumentWorkflowService.serialize_document(item) for item in documents],
            "requests": [DocumentWorkflowService.serialize_request(item) for item in requests],
            "cases": [{"id": str(item.id), "case_number": item.case_number, "title": item.title,
                       "client_id": str(item.client_id), "client_name": item.client.full_name}
                      for item in cases.select_related("client").order_by("-created_at")],
        }

    @staticmethod
    def upload(user, data):
        cases = DocumentWorkflowService.accessible_cases_for_secretary(user)
        case_id = data.get("case_id")
        if not case_id and data.get("request_id"):
            from apps.documents.models import DocumentRequest
            try:
                case_id = DocumentRequest.objects.get(id=data["request_id"]).case_id
            except DocumentRequest.DoesNotExist as exc:
                raise ValidationError({"request_id": "Document request was not found."}) from exc
        try:
            case = cases.select_related("client").get(id=case_id)
        except Exception as exc:
            raise ValidationError({"case_id": "Select an accessible matter."}) from exc
        return DocumentWorkflowService.upload(client=case.client, user=user, data=data)
