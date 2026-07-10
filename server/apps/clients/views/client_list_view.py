from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clients.serializers.client_serializer import (
    ClientSerializer,
)

from apps.clients.services.client_service import (
    ClientService,
)

from apps.clients.services.client_analytics_service import (
    ClientAnalyticsService,
)


class ClientListView(APIView):

    permission_classes = [
        IsAuthenticated
    ]

    def get(self, request):

        clients = (
            ClientService.get_all_clients(
                request.user
            )
        )

        analytics = (
            ClientAnalyticsService.get_dashboard_summary(
                request.user
            )
        )

        return Response(
            {
                "analytics": analytics,
                "clients": ClientSerializer(
                    clients,
                    many=True,
                ).data,
            }
        )