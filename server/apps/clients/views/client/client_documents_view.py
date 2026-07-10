from rest_framework import status
from rest_framework.response import Response

from apps.clients.serializers.client.client_document_serializer import ClientDocumentSerializer
from apps.clients.services.client.client_document_service import ClientDocumentService
from apps.clients.views.client.client_base_view import ClientBaseView


class ClientDocumentsView(ClientBaseView):
    def get(self, request):
        try:
            client = request.user.client_profile
        except Exception:
            return Response({"detail": "Only clients can access this endpoint."}, status=status.HTTP_403_FORBIDDEN)

        serializer = ClientDocumentSerializer(ClientDocumentService.list_documents(client), many=True)
        return Response({"documents": serializer.data}, status=status.HTTP_200_OK)
