from rest_framework import status
from rest_framework.response import Response

from apps.clients.models import Client
from apps.clients.views.client_admin_base_view import ClientAdminBaseView


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
        if action == "activate":
            client.is_active = True
            client.lifecycle_status = Client.LifecycleStatus.OFFICIAL_CLIENT
        else:
            client.is_active = False
            client.lifecycle_status = Client.LifecycleStatus.ARCHIVED

        client.save(update_fields=["is_active", "lifecycle_status"])
        return Response({"detail": f"Client {action}d successfully.", "client": {"id": str(client.id), "is_active": client.is_active, "lifecycle_status": client.lifecycle_status}}, status=status.HTTP_200_OK)
