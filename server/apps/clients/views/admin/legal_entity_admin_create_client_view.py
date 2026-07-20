from django.forms.models import model_to_dict
from rest_framework import status
from rest_framework.response import Response

from apps.clients.models import Client
from apps.clients.serializers.admin.legal_entity_admin_create_client_serializer import (
    LegalEntityAdminCreateClientSerializer,
)
from apps.clients.serializers.client_detail_serializer import (
    ClientAddressSerializer,
    ClientContactSerializer,
    ClientDetailSerializer,
)
from apps.clients.services.admin.client_admin_create_service import ClientAdminCreateService
from apps.clients.views.admin.client_admin_base_view import ClientAdminBaseView


def _portal_user_payload(user):
    if not user:
        return None
    return {
        "id": str(user.id),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "phone_number": user.phone_number,
        "role": user.role,
        "is_active": user.is_active,
        "must_change_password": user.must_change_password,
    }


def _profile_payload(profile):
    data = model_to_dict(profile)
    data["id"] = str(profile.id)
    data["client"] = str(profile.client_id)
    return data


def _representative_payload(rep):
    return {
        "id": str(rep.id),
        "full_legal_name": rep.full_legal_name,
        "representative_category": rep.representative_category,
        "role_title": rep.role_title,
        "email": rep.email,
        "telephone": rep.telephone,
        "authority_type": rep.authority_type,
        "authority_document_reference": rep.authority_document_reference,
        "authority_start_date": rep.authority_start_date,
        "authority_end_date": rep.authority_end_date,
        "is_primary": rep.is_primary,
        "is_portal_contact": rep.is_portal_contact,
        "is_litigation_representative": rep.is_litigation_representative,
        "is_verified": rep.is_verified,
    }


def build_legal_entity_create_response(result):
    return {
        "client": ClientDetailSerializer(result["client"]).data,
        "profile": _profile_payload(result["profile"]),
        "representatives": [
            _representative_payload(rep)
            for rep in result.get("representatives", [])
        ],
        "registered_address": (
            ClientAddressSerializer(result["registered_address"]).data
            if result.get("registered_address")
            else None
        ),
        "primary_contact": (
            ClientContactSerializer(result["primary_contact"]).data
            if result.get("primary_contact")
            else None
        ),
        "portal_user": _portal_user_payload(result.get("user")),
        "temp_password": result.get("temp_password"),
    }


class LegalEntityAdminCreateClientView(ClientAdminBaseView):
    client_type = None

    def post(self, request):
        data = request.data.copy()
        if self.client_type:
            data["client_type"] = self.client_type

        firm = self.get_firm()
        serializer = LegalEntityAdminCreateClientSerializer(
            data=data,
            context={"firm": firm},
        )
        serializer.is_valid(raise_exception=True)

        result = ClientAdminCreateService.create_legal_entity_client(
            firm=firm,
            created_by=request.user,
            validated_data=serializer.validated_data,
        )

        response = build_legal_entity_create_response(result)

        return Response(response, status=status.HTTP_201_CREATED)


class SoleProprietorshipAdminCreateClientView(LegalEntityAdminCreateClientView):
    client_type = Client.ClientType.SOLE_PROPRIETORSHIP


class CanonicalPartnershipAdminCreateClientView(LegalEntityAdminCreateClientView):
    client_type = Client.ClientType.PARTNERSHIP


class LimitedLiabilityPartnershipAdminCreateClientView(LegalEntityAdminCreateClientView):
    client_type = Client.ClientType.LIMITED_LIABILITY_PARTNERSHIP


class CanonicalCooperativeAdminCreateClientView(LegalEntityAdminCreateClientView):
    client_type = Client.ClientType.COOPERATIVE


class SocietyAssociationAdminCreateClientView(LegalEntityAdminCreateClientView):
    client_type = Client.ClientType.SOCIETY_OR_ASSOCIATION


class NonProfitOrganizationAdminCreateClientView(LegalEntityAdminCreateClientView):
    client_type = Client.ClientType.NON_PROFIT_ORGANIZATION


class CanonicalTrustAdminCreateClientView(LegalEntityAdminCreateClientView):
    client_type = Client.ClientType.TRUST


class CanonicalEstateAdminCreateClientView(LegalEntityAdminCreateClientView):
    client_type = Client.ClientType.ESTATE


class PublicEntityAdminCreateClientView(LegalEntityAdminCreateClientView):
    client_type = Client.ClientType.PUBLIC_ENTITY


class InternationalOrganizationAdminCreateClientView(LegalEntityAdminCreateClientView):
    client_type = Client.ClientType.INTERNATIONAL_ORGANIZATION
