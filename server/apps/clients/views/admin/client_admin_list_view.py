from rest_framework import status
from rest_framework.response import Response

from apps.clients.models import Client
from apps.clients.serializers.admin.client_admin_list_serializer import ClientAdminListSerializer
from apps.clients.services.admin.client_admin_query_service import ClientAdminQueryService
from apps.clients.views.admin.client_admin_base_view import ClientAdminBaseView


class ClientAdminListView(ClientAdminBaseView):
    def get(self, request):
        try:
            firm = self.get_firm()
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        clients = ClientAdminQueryService.get_firm_clients(
            firm,
            tab=request.query_params.get("tab"),
            search=request.query_params.get("search"),
        )
        serializer = ClientAdminListSerializer(clients, many=True)
        return Response(
            {
                "clients": serializer.data,
                "metadata": {
                    "total_clients": clients.count(),
                    "active_clients": clients.filter(is_active=True).count(),
                    "inactive_clients": clients.filter(is_active=False).count(),
                    "prospects_with_access": clients.filter(
                        access_type=Client.AccessType.PORTAL_ENABLED,
                        lifecycle_status__in=[Client.LifecycleStatus.PROSPECTIVE, Client.LifecycleStatus.PROSPECT],
                    ).count(),
                    "assisted_clients": clients.filter(
                        access_type=Client.AccessType.ASSISTED,
                    ).count(),
                    "prospects": clients.filter(
                        lifecycle_status__in=[
                            Client.LifecycleStatus.PROSPECTIVE,
                            Client.LifecycleStatus.PROSPECT,
                        ],
                    ).count(),
                    "official_clients": clients.filter(
                        lifecycle_status__in=[
                            Client.LifecycleStatus.OFFICIAL,
                            Client.LifecycleStatus.OFFICIAL_CLIENT,
                        ],
                    ).count(),
                    "archived_clients": clients.filter(
                        lifecycle_status=Client.LifecycleStatus.ARCHIVED,
                    ).count(),
                    "deleted_clients": clients.filter(soft_deleted_at__isnull=False).count(),
                },
            },
            status=status.HTTP_200_OK,
        )
