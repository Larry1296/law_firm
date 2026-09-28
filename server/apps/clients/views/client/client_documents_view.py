from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.clients.services.client.client_document_service import ClientDocumentService
from apps.clients.views.client.client_base_view import ClientBaseView


class ClientDocumentsView(ClientBaseView):
    def get(self, request):
        try:
            client = request.user.client_profile
        except Exception:
            return Response({"detail": "Only clients can access this endpoint."}, status=status.HTTP_403_FORBIDDEN)

        return Response(ClientDocumentService.workspace(client, request.query_params), status=status.HTTP_200_OK)

    def post(self, request):
        """A client may upload only against an open request from their firm for one of their matters."""
        client = getattr(request.user, "client_profile", None)
        if client is None:
            return Response({"detail": "Only clients can access this endpoint."}, status=status.HTTP_403_FORBIDDEN)
        if not request.data.get("request_id"):
            return Response(
                {"request_id": "Uploads are accepted only for a document your advocate has requested."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = {key: request.data.get(key) for key in ("request_id", "description")}
        data["file"] = request.FILES.get("file")
        data["received_via"] = "CLIENT_PORTAL"
        data["source_copy_type"] = "CLIENT_COPY"
        try:
            document = ClientDocumentService.upload(client, request.user, data)
        except ValidationError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)
        return Response({"document_id": str(document.id)}, status=status.HTTP_201_CREATED)
