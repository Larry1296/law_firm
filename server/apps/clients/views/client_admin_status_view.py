from rest_framework import status
from rest_framework.response import Response

from apps.clients.models import Client
from apps.clients.views.client_admin_base_view import ClientAdminBaseView
from apps.clients.services.admin.client_admin_status_service import ClientAdminStatusService


class ClientAdminStatusView(ClientAdminBaseView):

    def post(self, request, client_id):
        try:
            firm = self.get_firm()
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        try:
            client = Client.objects.get(id=client_id, firm=firm)
        except Client.DoesNotExist:
            return Response({"detail": "Client not found."}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get("action", "activate")

        if action not in ["activate", "deactivate"]:
            return Response({"detail": "Invalid action."}, status=status.HTTP_400_BAD_REQUEST)

        updated_client = ClientAdminStatusService.set_status(client, action)

        return Response(
            {
                "detail": f"Client {action}d successfully.",
                "client": {
                    "id": str(updated_client.id),
                    "is_active": updated_client.is_active,
                    "lifecycle_status": updated_client.lifecycle_status,
                },
            },
            status=status.HTTP_200_OK,
        )