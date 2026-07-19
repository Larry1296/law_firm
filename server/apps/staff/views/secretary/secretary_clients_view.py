from rest_framework import status
from rest_framework.response import Response

from apps.clients.models import Client
from apps.clients.serializers.client.client_type_profile_serializer import (
    IndividualClientProfileSerializer,
)
from apps.clients.serializers.client_detail_serializer import (
    ClientAddressSerializer,
    ClientContactSerializer,
    ClientDetailSerializer,
)
from apps.clients.serializers.admin import (
    ClientAdminDetailSerializer,
    CompanyAdminCreateClientSerializer,
    EstateAdminCreateClientSerializer,
    GovernmentAdminCreateClientSerializer,
    IndividualAdminCreateClientSerializer,
    NGOAdminCreateClientSerializer,
    PartnershipAdminCreateClientSerializer,
    TrustAdminCreateClientSerializer,
)
from apps.clients.services.admin.client_admin_create_service import (
    ClientAdminCreateService,
)
from apps.staff.serializers.secretary import SecretaryClientSerializer
from apps.staff.services.secretary import SecretaryClientService
from apps.staff.views.secretary.secretary_base_view import SecretaryBaseView


CLIENT_CREATE_CONFIG = {
    "individuals": (Client.ClientType.INDIVIDUAL, IndividualAdminCreateClientSerializer),
    "companies": (Client.ClientType.COMPANY, CompanyAdminCreateClientSerializer),
    "saccos": (Client.ClientType.SACCO, CompanyAdminCreateClientSerializer),
    "cooperatives": (Client.ClientType.COOPERATIVE, CompanyAdminCreateClientSerializer),
    "partnerships": (Client.ClientType.PARTNERSHIP, PartnershipAdminCreateClientSerializer),
    "ngos": (Client.ClientType.NGO, NGOAdminCreateClientSerializer),
    "associations": (Client.ClientType.NGO_ASSOCIATION, NGOAdminCreateClientSerializer),
    "religious-organizations": (Client.ClientType.RELIGIOUS_ORGANIZATION, NGOAdminCreateClientSerializer),
    "trusts": (Client.ClientType.TRUST, TrustAdminCreateClientSerializer),
    "estates": (Client.ClientType.ESTATE, EstateAdminCreateClientSerializer),
    "government": (Client.ClientType.GOVERNMENT, GovernmentAdminCreateClientSerializer),
    "educational-institutions": (Client.ClientType.EDUCATIONAL_INSTITUTION, GovernmentAdminCreateClientSerializer),
}


class SecretaryClientsView(SecretaryBaseView):
    def get(self, request):
        try:
            clients = SecretaryClientService.list_clients(request.user)
        except (ValueError, PermissionError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        serializer = SecretaryClientSerializer(clients, many=True)
        return Response({"clients": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request, client_type=None):
        try:
            secretary = SecretaryClientService.ensure_can_manage_clients(request.user)
            create_config = CLIENT_CREATE_CONFIG.get(client_type)

            if create_config is None:
                return Response(
                    {"detail": "Unsupported client type."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            model_client_type, serializer_class = create_config
            serializer = serializer_class(
                data=request.data,
                context={"firm": secretary.law_firm},
            )
            serializer.is_valid(raise_exception=True)

            result = ClientAdminCreateService.create_client(
                firm=secretary.law_firm,
                created_by=request.user,
                client_type=model_client_type,
                validated_data=serializer.validated_data,
            )
        except (ValueError, PermissionError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        if model_client_type == Client.ClientType.INDIVIDUAL:
            portal_user = result.get("user")
            response = {
                "client": ClientDetailSerializer(result["client"]).data,
                "profile": IndividualClientProfileSerializer(result["profile"]).data,
                "primary_contact": (
                    ClientContactSerializer(result["primary_contact"]).data
                    if result.get("primary_contact")
                    else None
                ),
                "primary_address": (
                    ClientAddressSerializer(result["registered_address"]).data
                    if result.get("registered_address")
                    else None
                ),
                "next_of_kin": (
                    ClientContactSerializer(result["next_of_kin"]).data
                    if result.get("next_of_kin")
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
        else:
            response = {"client": ClientAdminDetailSerializer(result["client"]).data}
            if result.get("temp_password"):
                response["temp_password"] = result["temp_password"]

        return Response(response, status=status.HTTP_201_CREATED)
