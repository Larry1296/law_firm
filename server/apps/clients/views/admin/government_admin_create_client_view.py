from rest_framework import status
from rest_framework.response import Response

from apps.clients.models import Client
from apps.clients.serializers.admin.client_admin_detail_serializer import ClientAdminDetailSerializer
from apps.clients.serializers.admin.government_admin_create_client_serializer import (
    GovernmentAdminCreateClientSerializer,
)
from apps.clients.services.admin.client_admin_create_service import ClientAdminCreateService
from apps.clients.views.admin.client_admin_base_view import ClientAdminBaseView


class GovernmentAdminCreateClientView(ClientAdminBaseView):
    def post(self, request):
        serializer = GovernmentAdminCreateClientSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = ClientAdminCreateService.create_client(
            firm=self.get_firm(),
            created_by=request.user,
            client_type=Client.ClientType.GOVERNMENT,
            validated_data=serializer.validated_data,
        )

        response = {"client": ClientAdminDetailSerializer(result["client"]).data}
        if result.get("temp_password"):
            response["temp_password"] = result["temp_password"]

        return Response(response, status=status.HTTP_201_CREATED)
