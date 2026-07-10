from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.lawyer.lawyer_document_serializer import (
    LawyerDocumentSerializer,
)
from apps.staff.services.lawyer.lawyer_document_service import LawyerDocumentService
from apps.staff.views.lawyer.lawyer_base_view import LawyerBaseView


class LawyerDocumentsView(LawyerBaseView):
    def get(self, request):
        try:
            documents = LawyerDocumentService.list_documents(request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        serializer = LawyerDocumentSerializer(documents, many=True)
        return Response({"documents": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request):
        try:
            result = LawyerDocumentService.upload_document(request.user, request.data)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        return Response(result, status=status.HTTP_201_CREATED)
