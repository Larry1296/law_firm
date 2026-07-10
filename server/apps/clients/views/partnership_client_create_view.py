from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clients.serializers.partnership_client_create_serializer import (
    PartnershipClientCreateSerializer,
)
from apps.clients.serializers.partnership_client_response_serializer import (
    PartnershipClientResponseSerializer,
)
from apps.clients.services.partnership_client_service import (
    PartnershipClientService,
)


class PartnershipClientCreateView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = PartnershipClientCreateSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        client = PartnershipClientService.create_client(
            validated_data=serializer.validated_data,
            user=request.user,
        )

        response_serializer = PartnershipClientResponseSerializer(
            client
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
        )