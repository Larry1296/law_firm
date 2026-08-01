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
            if request.data.get("action") == "request":
                return Response(SecretaryDocumentService.create_request(request.user, request.data), status=201)
            if request.data.get("action") == "assign_drawer":
                return Response(SecretaryDocumentService.assign_kyc_drawer(request.user, request.data), status=200)
            if request.data.get("action") != "register_physical":
                return Response({"detail": "Document uploads are disabled. Record the physical KYC drawer entry."}, status=400)
            document = SecretaryDocumentService.register_physical_document(request.user, request.data)
            return Response({"document": DocumentWorkflowService.serialize_document(document)}, status=201)
        except Exception as exc:
            return Response({"detail": getattr(exc, "detail", str(exc))}, status=getattr(exc, "status_code", 400))


class SecretaryDocumentVerificationView(SecretaryBaseView):
    def patch(self, request, request_id):
        try:
            return Response(SecretaryDocumentService.verify_client_upload(request.user, request_id, request.data))
        except Exception as exc:
            return Response({"detail": getattr(exc, "detail", str(exc))}, status=getattr(exc, "status_code", 400))


class SecretaryDocumentDispatchView(SecretaryBaseView):
    def post(self, request, request_id):
        try:
            return Response(SecretaryDocumentService.dispatch_request(request.user, request_id, request.data))
        except Exception as exc:
            return Response({"detail": getattr(exc, "detail", str(exc))}, status=getattr(exc, "status_code", 400))
