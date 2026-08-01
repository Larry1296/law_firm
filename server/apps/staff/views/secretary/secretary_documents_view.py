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
            if request.data.get("action") == "propose_reference":
                return Response(SecretaryDocumentService.propose_document_reference(request.user, request.data.get("client_id")), status=200)
            if request.data.get("action") == "create_receipt":
                receipt = SecretaryDocumentService.create_receipt(request.user, request.data)
                return Response({"receipt_number": receipt.receipt_number}, status=201)
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


class SecretaryPhysicalDocumentActionView(SecretaryBaseView):
    def post(self, request, document_id):
        try:
            if request.data.get("action") == "correct_reference":
                document = SecretaryDocumentService.correct_document_reference(request.user, document_id, request.data)
                return Response({"document": DocumentWorkflowService.serialize_document(document)})
            if request.data.get("action") == "custody_movement":
                movement = SecretaryDocumentService.record_custody_movement(request.user, document_id, request.data)
                return Response({"movement": {"id": str(movement.id), "from": movement.from_location_or_custodian, "to": movement.to_location_or_custodian, "movement_type": movement.movement_type, "moved_at": movement.moved_at, "purpose": movement.purpose}}, status=201)
            return Response({"detail": "Select a supported controlled document action."}, status=400)
        except Exception as exc:
            return Response({"detail": getattr(exc, "detail", str(exc))}, status=getattr(exc, "status_code", 400))
