from rest_framework import serializers

from apps.clients.models import (
    CompanyClient,
    EstateClient,
    GovernmentClient,
    IndividualClient,
    NGOClient,
    PartnershipClient,
    TrustClient,
)


class IndividualClientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = IndividualClient
        exclude = ["client"]


class CompanyClientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyClient
        exclude = ["client", "user"]


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


def serialize_client_type_profile(client):
    profile_map = [
        ("individual_profile", IndividualClientProfileSerializer),
        ("company_profile", CompanyClientProfileSerializer),
        ("partnership_profile", PartnershipClientProfileSerializer),
        ("ngo_profile", NGOClientProfileSerializer),
        ("trust_profile", TrustClientProfileSerializer),
        ("estate_profile", EstateClientProfileSerializer),
        ("government_profile", GovernmentClientProfileSerializer),
    ]

    for related_name, serializer_class in profile_map:
        if hasattr(client, related_name):
            return serializer_class(getattr(client, related_name)).data

    return None
