from rest_framework import status
from rest_framework.response import Response

from apps.clients.serializers.admin.client_admin_status_serializer import ClientAdminStatusSerializer
from apps.clients.services.admin.client_admin_query_service import ClientAdminQueryService
from apps.clients.services.admin.client_admin_status_service import ClientAdminStatusService
from apps.clients.views.admin.client_admin_base_view import ClientAdminBaseView


class ClientAdminStatusView(ClientAdminBaseView):
    def post(self, request, client_id):
        try:
            firm = self.get_firm()
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        serializer = ClientAdminStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            client = ClientAdminQueryService.get_client(firm, client_id)
        except Exception:
            return Response({"detail": "Client not found."}, status=status.HTTP_404_NOT_FOUND)

        client = ClientAdminStatusService.set_status(client, serializer.validated_data["action"])
        return Response({"detail": "Client status updated.", "client": {"id": str(client.id), "is_active": client.is_active, "lifecycle_status": client.lifecycle_status}}, status=status.HTTP_200_OK)
