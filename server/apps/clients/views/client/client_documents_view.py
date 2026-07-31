from rest_framework import status
from rest_framework.response import Response

from apps.clients.services.client.client_document_service import ClientDocumentService
from apps.documents.services.workflow_service import DocumentWorkflowService
from apps.clients.views.client.client_base_view import ClientBaseView


class ClientDocumentsView(ClientBaseView):
    def get(self, request):
        try:
            client = request.user.client_profile
        except Exception:
            return Response({"detail": "Only clients can access this endpoint."}, status=status.HTTP_403_FORBIDDEN)

        return Response(ClientDocumentService.workspace(client, request.query_params), status=status.HTTP_200_OK)

    def post(self, request):
        try:
            client = request.user.client_profile
            document = ClientDocumentService.upload(client, request.user, request.data)
            return Response({"document": DocumentWorkflowService.serialize_document(document)}, status=201)
        except Exception as exc:
            return Response(
                {"detail": getattr(exc, "detail", str(exc))},
                status=getattr(exc, "status_code", status.HTTP_400_BAD_REQUEST),
            )
