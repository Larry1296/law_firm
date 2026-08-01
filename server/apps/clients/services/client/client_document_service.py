from apps.documents.services.workflow_service import DocumentWorkflowService


class ClientDocumentService:
    @staticmethod
    def workspace(client, params):
        documents = DocumentWorkflowService.documents_for_client(
            client, query=params.get("q", "").strip(), case_id=params.get("case_id")
        ).filter(is_client_visible=True)
        requests = DocumentWorkflowService.requests_for_client(client, case_id=params.get("case_id"))
        cases = client.cases.filter(is_active=True).values("id", "case_number", "title")
        return {
            "documents": [DocumentWorkflowService.serialize_document(item) for item in documents],
            "requests": [DocumentWorkflowService.serialize_request(item) for item in requests],
            "cases": [{**item, "id": str(item["id"])} for item in cases],
        }

    @staticmethod
    def upload(client, user, data):
        return DocumentWorkflowService.upload(client=client, user=user, data=data)
