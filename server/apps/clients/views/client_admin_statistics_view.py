from rest_framework import status
from rest_framework.response import Response

from apps.clients.models import Client
from apps.clients.views.client_admin_base_view import ClientAdminBaseView


class ClientAdminStatisticsView(ClientAdminBaseView):
    def get(self, request):
        try:
            firm = self.get_firm()
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        clients = Client.objects.filter(firm=firm)
        return Response(
            {
                "statistics": {
                    "by_type": {
                        client_type: clients.filter(client_type=client_type).count()
                        for client_type in Client.ClientType.values
                    },
                    "by_status": {
                        status_value: clients.filter(lifecycle_status=status_value).count()
                        for status_value in Client.LifecycleStatus.values
                    },
                }
            },
            status=status.HTTP_200_OK,
        )
