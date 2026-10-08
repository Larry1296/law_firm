from rest_framework import status
from rest_framework.exceptions import ValidationError
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
        """The client tells the firm how a requested paper document will reach it. No file is taken."""
        client = getattr(request.user, "client_profile", None)
        if client is None:
            return Response({"detail": "Only clients can access this endpoint."}, status=status.HTTP_403_FORBIDDEN)
        if not request.data.get("request_id"):
            return Response(
                {"request_id": "Choose the document your advocate has requested."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if request.FILES:
            return Response({"file": DocumentWorkflowService.NO_FILES}, status=status.HTTP_400_BAD_REQUEST)
        data = {key: request.data.get(key) for key in ("request_id", "delivery_method", "expected_delivery_date", "note")}
        try:
            document = ClientDocumentService.record_delivery_notice(client, request.user, data)
        except ValidationError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return Response({"document_id": str(document.id)}, status=status.HTTP_201_CREATED)
