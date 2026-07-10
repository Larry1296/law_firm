from rest_framework import status
from rest_framework.permissions import (
    IsAuthenticated,
)
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clients.serializers import (
    ClientUpdateSerializer,
)

from apps.clients.serializers.client_detail_serializer import (
    ClientDetailSerializer,
)

from apps.clients.services.client_service import (
    ClientService,
)

from apps.clients.services.client_analytics_service import (
    ClientAnalyticsService,
)


class ClientDetailView(APIView):

    permission_classes = [
        IsAuthenticated
    ]

    def get(
        self,
        request,
        client_id,
    ):

        client = (
            ClientService.get_client_by_id(
                client_id,
                request.user,
            )
        )

        return Response(
            {
                "analytics": (
                    ClientAnalyticsService.get_client_summary(
                        client
                    )
                ),
                "client": (
                    ClientDetailSerializer(
                        client
                    ).data
                ),
            }
        )

    def patch(
        self,
        request,
        client_id,
    ):

        client = (
            ClientService.get_client_by_id(
                client_id,
                request.user,
            )
        )

        serializer = (
            ClientUpdateSerializer(
                client,
                data=request.data,
                partial=True,
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        client = (
            ClientService.update_client(
                client,
                **serializer.validated_data,
            )
        )

        return Response(
            {
                "analytics": (
                    ClientAnalyticsService.get_client_summary(
                        client
                    )
                ),
                "client": (
                    ClientDetailSerializer(
                        client
                    ).data
                ),
            }
        )

    def delete(
        self,
        request,
        client_id,
    ):

        client = (
            ClientService.get_client_by_id(
                client_id,
                request.user,
            )
        )

        ClientService.delete_client(
            client
        )

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )