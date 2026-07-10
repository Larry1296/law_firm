from rest_framework import status
from rest_framework.response import Response

from apps.clients.models import Client
from apps.clients.views.admin.client_admin_base_view import ClientAdminBaseView


class ClientAdminDashboardView(ClientAdminBaseView):
    def get(self, request):
        try:
            firm = self.get_firm()
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        clients = Client.objects.filter(firm=firm)
        return Response(
            {
                "dashboard": {
                    "total_clients": clients.count(),
                    "active_clients": clients.filter(is_active=True).count(),
                    "prospects": clients.filter(lifecycle_status=Client.LifecycleStatus.PROSPECT).count(),
                    "official_clients": clients.filter(lifecycle_status=Client.LifecycleStatus.OFFICIAL_CLIENT).count(),
                    "archived_clients": clients.filter(lifecycle_status=Client.LifecycleStatus.ARCHIVED).count(),
                }
            },
            status=status.HTTP_200_OK,
        )
