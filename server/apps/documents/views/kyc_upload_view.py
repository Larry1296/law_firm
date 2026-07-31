from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clients.models import Client
from apps.documents.services.workflow_service import DocumentWorkflowService
from apps.staff.models import SecretaryPermission


class KycDocumentUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def _client(self, request, client_id):
        user = request.user
        secretary = getattr(user, "secretary_profile", None)
        if secretary and secretary.is_active and (
            secretary.can_receive_documents
            or secretary.has_permission(SecretaryPermission.MANAGE_DOCUMENTS)
            or secretary.has_permission(SecretaryPermission.MANAGE_CLIENTS)
        ):
            return Client.objects.get(id=client_id, firm=secretary.law_firm)
        if getattr(user, "is_admin", False):
            return Client.objects.get(
                id=client_id, firm__members__user=user, firm__members__is_active=True
            )
        if getattr(user, "client_profile", None) and user.client_profile.id == client_id:
            return user.client_profile
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("You cannot add KYC documents to this client file.")

    def post(self, request, client_id):
        try:
            client = self._client(request, client_id)
            document = DocumentWorkflowService.upload(client=client, user=request.user, data=request.data)
            return Response({"document": DocumentWorkflowService.serialize_document(document)}, status=201)
        except Exception as exc:
            return Response({"detail": getattr(exc, "detail", str(exc))}, status=getattr(exc, "status_code", 400))
