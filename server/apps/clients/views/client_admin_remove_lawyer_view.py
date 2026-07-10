from rest_framework import status
from rest_framework.response import Response

from apps.clients.models import Client
from apps.clients.views.client_admin_base_view import ClientAdminBaseView


class ClientAdminRemoveLawyerView(ClientAdminBaseView):
    def delete(self, request, client_id, lawyer_id):
        try:
            firm = self.get_firm()
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        try:
            client = Client.objects.get(id=client_id, firm=firm)
        except Client.DoesNotExist:
            return Response({"detail": "Client not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response({"detail": "Removal endpoint ready.", "client_id": str(client.id), "lawyer_id": lawyer_id}, status=status.HTTP_200_OK)
