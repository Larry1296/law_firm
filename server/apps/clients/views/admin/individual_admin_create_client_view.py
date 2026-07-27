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
from apps.clients.serializers.admin.individual_admin_create_client_serializer import (
    IndividualAdminCreateClientSerializer,
)
from apps.clients.services.admin.client_admin_create_service import ClientAdminCreateService
from apps.clients.views.admin.client_admin_base_view import ClientAdminBaseView


def build_individual_create_response(result):
    portal_user = result.get("user")
    return {
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
        "due_diligence": {
            "acting_for_self": result["due_diligence"].acting_for_self,
            "represented_person": result["due_diligence"].represented_person,
            "representation_capacity": result["due_diligence"].representation_capacity,
            "authority_document_reference": result["due_diligence"].authority_document_reference,
            "authority_verified": result["due_diligence"].authority_verified,
            "purpose_and_nature_of_relationship": result["due_diligence"].purpose_and_nature_of_relationship,
            "pep_status": result["due_diligence"].pep_status,
            "sanctions_screening_status": result["due_diligence"].sanctions_screening_status,
            "screening_date": result["due_diligence"].screening_date,
            "screening_method": result["due_diligence"].screening_method,
            "screening_result": result["due_diligence"].screening_result,
            "risk_rating": result["due_diligence"].risk_rating,
            "risk_assessment_reason": result["due_diligence"].risk_assessment_reason,
            "enhanced_due_diligence_required": result["due_diligence"].enhanced_due_diligence_required,
            "enhanced_due_diligence_reason": result["due_diligence"].enhanced_due_diligence_reason,
        },
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


class IndividualAdminCreateClientView(ClientAdminBaseView):
    def post(self, request):
        firm = self.get_firm()
        serializer = IndividualAdminCreateClientSerializer(
            data=request.data,
            context={"firm": firm},
        )
        serializer.is_valid(raise_exception=True)

        result = ClientAdminCreateService.create_client(
            firm=firm,
            created_by=request.user,
            client_type=Client.ClientType.INDIVIDUAL,
            validated_data=serializer.validated_data,
        )

        return Response(
            build_individual_create_response(result),
            status=status.HTTP_201_CREATED,
        )
