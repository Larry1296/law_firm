from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.secretary import SecretaryDocumentSerializer
from apps.staff.services.secretary import SecretaryDocumentService
from apps.staff.views.secretary.secretary_base_view import SecretaryBaseView


class SecretaryDocumentsView(SecretaryBaseView):
    def get(self, request):
        try:
            documents = SecretaryDocumentService.list_documents(request.user)
        except (ValueError, PermissionError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        serializer = SecretaryDocumentSerializer(documents, many=True)
        return Response({"documents": serializer.data}, status=status.HTTP_200_OK)
