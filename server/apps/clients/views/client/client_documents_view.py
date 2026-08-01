from rest_framework import status
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
        return Response(
            {"detail": "Document uploads are disabled. Deliver the physical document to the firm secretary for KYC drawer registration."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )
