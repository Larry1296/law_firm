from rest_framework import status
from rest_framework.response import Response

from apps.clients.services.admin.client_admin_query_service import ClientAdminQueryService
from apps.clients.views.admin.client_admin_base_view import ClientAdminBaseView


class ClientAdminAssignView(ClientAdminBaseView):
    def post(self, request, client_id):
        try:
            firm = self.get_firm()
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        try:
            client = ClientAdminQueryService.get_client(firm, client_id)
        except Exception:
            return Response({"detail": "Client not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response({"detail": "Assignment endpoint ready.", "client_id": str(client.id)}, status=status.HTTP_200_OK)
