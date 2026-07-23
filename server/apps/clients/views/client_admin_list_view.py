from rest_framework import status
from rest_framework.response import Response

from apps.clients.models import Client
from apps.clients.services.admin.client_admin_query_service import ClientAdminQueryService
from apps.clients.serializers.client_serializer import ClientSerializer
from apps.clients.views.client_admin_base_view import ClientAdminBaseView


class ClientAdminListView(ClientAdminBaseView):
    def get(self, request):
        try:
            firm = self.get_firm()
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        clients = ClientAdminQueryService.get_firm_clients(
            firm,
            tab=request.query_params.get("tab"),
        )
        return Response(
            {
                "clients": ClientSerializer(clients, many=True).data,
                "metadata": {
                    "total_clients": clients.count(),
                    "active_clients": clients.filter(is_active=True).count(),
                    "archived_clients": Client.objects.filter(firm=firm, lifecycle_status="ARCHIVED").count(),
                    "tabs": [
                        "prospective",
                        "official",
                        "pending_proposed_matters",
                        "awaiting_acceptance",
                        "rejected_matters",
                        "archived",
                    ],
                },
            },
            status=status.HTTP_200_OK,
        )
