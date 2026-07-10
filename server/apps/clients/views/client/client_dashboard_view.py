from rest_framework import status
from rest_framework.response import Response

from apps.clients.serializers.client.client_dashboard_serializer import ClientDashboardSerializer
from apps.clients.services.client.client_dashboard_service import ClientDashboardService
from apps.clients.views.client.client_base_view import ClientBaseView


class ClientDashboardView(ClientBaseView):
    def get(self, request):
        try:
            client = request.user.client_profile
        except Exception:
            return Response({"detail": "Only clients can access this endpoint."}, status=status.HTTP_403_FORBIDDEN)

        serializer = ClientDashboardSerializer(ClientDashboardService.get_dashboard_data(client))
        return Response(serializer.data, status=status.HTTP_200_OK)
