from rest_framework import status
from rest_framework.response import Response

from apps.clients.services.admin.client_admin_delete_service import ClientAdminDeleteService
from apps.clients.services.admin.client_admin_query_service import ClientAdminQueryService
from apps.clients.views.admin.client_admin_base_view import ClientAdminBaseView


class ClientAdminDeleteView(ClientAdminBaseView):
    def delete(self, request, client_id):
        try:
            firm = self.get_firm()
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        try:
            client = ClientAdminQueryService.get_client(firm, client_id)
        except Exception:
            return Response({"detail": "Client not found."}, status=status.HTTP_404_NOT_FOUND)

        result = ClientAdminDeleteService.delete_client(client)
        if result["action"] == "archived":
            return Response(
                {
                    "detail": "Client has linked cases and was archived instead.",
                    "action": "archived",
                    "client": {
                        "id": str(result["client"].id),
                        "is_active": result["client"].is_active,
                        "lifecycle_status": result["client"].lifecycle_status,
                    },
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {"detail": "Client deleted successfully.", "action": "deleted"},
            status=status.HTTP_200_OK,
        )
