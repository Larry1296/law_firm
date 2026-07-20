from rest_framework import serializers

from apps.clients.models import (
    CompanyClient,
    CooperativeClient,
    EstateClient,
    GovernmentClient,
    IndividualClient,
    InternationalOrganizationClient,
    LimitedLiabilityPartnershipClient,
    NGOClient,
    NonProfitOrganizationClient,
    PartnershipClient,
    PublicEntityClient,
    SocietyAssociationClient,
    SoleProprietorshipClient,
    TrustClient,
)


class IndividualClientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = IndividualClient
        exclude = ["client"]


class CompanyClientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyClient
        exclude = ["client"]


class PartnershipClientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnershipClient
        exclude = ["client"]


class NGOClientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = NGOClient
        exclude = ["client"]


class TrustClientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrustClient
        exclude = ["client"]


class EstateClientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstateClient
        exclude = ["client"]


class GovernmentClientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = GovernmentClient
        exclude = ["client"]


class SoleProprietorshipClientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = SoleProprietorshipClient
        exclude = ["client"]


class LimitedLiabilityPartnershipClientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = LimitedLiabilityPartnershipClient
        exclude = ["client"]


class CooperativeClientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CooperativeClient
        exclude = ["client"]


class SocietyAssociationClientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocietyAssociationClient
        exclude = ["client"]


class NonProfitOrganizationClientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = NonProfitOrganizationClient
        exclude = ["client"]


class PublicEntityClientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PublicEntityClient
        exclude = ["client"]


class InternationalOrganizationClientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = InternationalOrganizationClient
        exclude = ["client"]


def serialize_client_type_profile(client):
    profile_map = [
        ("individual_profile", IndividualClientProfileSerializer),
        ("company_profile", CompanyClientProfileSerializer),
        ("partnership_profile", PartnershipClientProfileSerializer),
        ("sole_proprietorship_profile", SoleProprietorshipClientProfileSerializer),
        ("llp_profile", LimitedLiabilityPartnershipClientProfileSerializer),
        ("cooperative_profile", CooperativeClientProfileSerializer),
        ("society_association_profile", SocietyAssociationClientProfileSerializer),
        ("nonprofit_profile", NonProfitOrganizationClientProfileSerializer),
        ("public_entity_profile", PublicEntityClientProfileSerializer),
        ("international_organization_profile", InternationalOrganizationClientProfileSerializer),
        ("ngo_profile", NGOClientProfileSerializer),
        ("trust_profile", TrustClientProfileSerializer),
        ("estate_profile", EstateClientProfileSerializer),
        ("government_profile", GovernmentClientProfileSerializer),
    ]

    for related_name, serializer_class in profile_map:
        if hasattr(client, related_name):
            return serializer_class(getattr(client, related_name)).data

    return None
