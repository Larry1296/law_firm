from rest_framework import status
from rest_framework.response import Response

from apps.documents.services.workflow_service import DocumentWorkflowService
from apps.staff.services.secretary import SecretaryDocumentService
from apps.staff.views.secretary.secretary_base_view import SecretaryBaseView


class SecretaryDocumentsView(SecretaryBaseView):
    def get(self, request):
        try:
            return Response(SecretaryDocumentService.workspace(request.user, request.query_params))
        except Exception as exc:
            return Response({"detail": str(exc)}, status=getattr(exc, "status_code", status.HTTP_403_FORBIDDEN))

    def post(self, request):
        try:
            document = SecretaryDocumentService.upload(request.user, request.data)
            return Response({"document": DocumentWorkflowService.serialize_document(document)}, status=201)
        except Exception as exc:
            return Response({"detail": getattr(exc, "detail", str(exc))}, status=getattr(exc, "status_code", 400))
