from rest_framework import status
from rest_framework.response import Response

from apps.clients.models import Client
from apps.clients.serializers.client.client_type_profile_serializer import (
    CompanyClientProfileSerializer,
)
from apps.clients.serializers.client_detail_serializer import (
    ClientAddressSerializer,
    ClientContactSerializer,
    ClientDetailSerializer,
)
from apps.clients.serializers.admin.company_admin_create_client_serializer import (
    CompanyAdminCreateClientSerializer,
)
from apps.clients.services.admin.client_admin_create_service import ClientAdminCreateService
from apps.clients.views.admin.client_admin_base_view import ClientAdminBaseView


class CompanyAdminCreateClientView(ClientAdminBaseView):
    client_type = Client.ClientType.COMPANY

    def post(self, request):
        serializer = CompanyAdminCreateClientSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = ClientAdminCreateService.create_client(
            firm=self.get_firm(),
            created_by=request.user,
            client_type=self.client_type,
            validated_data=serializer.validated_data,
        )

        portal_user = result.get("user")
        response = {
            "client": ClientDetailSerializer(result["client"]).data,
            "profile": CompanyClientProfileSerializer(result["profile"]).data,
            "primary_contact": (
                ClientContactSerializer(result["primary_contact"]).data
                if result.get("primary_contact")
                else None
            ),
            "registered_address": (
                ClientAddressSerializer(result["registered_address"]).data
                if result.get("registered_address")
                else None
            ),
            "portal_user": (
                {
                    "id": str(portal_user.id),
                    "email": portal_user.email,
                    "first_name": portal_user.first_name,
                    "last_name": portal_user.last_name,
                    "phone_number": portal_user.phone_number,
                    "role": portal_user.role,
                    "is_active": portal_user.is_active,
                    "must_change_password": portal_user.must_change_password,
                }
                if portal_user
                else None
            ),
            "temp_password": result.get("temp_password"),
        }

        return Response(response, status=status.HTTP_201_CREATED)


class SaccoAdminCreateClientView(CompanyAdminCreateClientView):
    client_type = Client.ClientType.SACCO


class CooperativeAdminCreateClientView(CompanyAdminCreateClientView):
    client_type = Client.ClientType.COOPERATIVE
