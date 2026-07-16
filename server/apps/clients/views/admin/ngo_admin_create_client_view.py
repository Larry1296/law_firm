from rest_framework import status
from rest_framework.response import Response

from apps.clients.models import Client
from apps.clients.serializers.admin.client_admin_detail_serializer import ClientAdminDetailSerializer
from apps.clients.serializers.admin.ngo_admin_create_client_serializer import (
    NGOAdminCreateClientSerializer,
)
from apps.clients.services.admin.client_admin_create_service import ClientAdminCreateService
from apps.clients.views.admin.client_admin_base_view import ClientAdminBaseView


class NGOAdminCreateClientView(ClientAdminBaseView):
    client_type = Client.ClientType.NGO

    def post(self, request):
        serializer = NGOAdminCreateClientSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = ClientAdminCreateService.create_client(
            firm=self.get_firm(),
            created_by=request.user,
            client_type=self.client_type,
            validated_data=serializer.validated_data,
        )

        response = {"client": ClientAdminDetailSerializer(result["client"]).data}
        if result.get("temp_password"):
            response["temp_password"] = result["temp_password"]

        return Response(response, status=status.HTTP_201_CREATED)


class AssociationAdminCreateClientView(NGOAdminCreateClientView):
    client_type = Client.ClientType.NGO_ASSOCIATION


class ReligiousOrganizationAdminCreateClientView(NGOAdminCreateClientView):
    client_type = Client.ClientType.RELIGIOUS_ORGANIZATION
