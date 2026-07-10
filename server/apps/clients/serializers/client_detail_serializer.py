from rest_framework import serializers

from apps.clients.models import (
    Client,
    ClientAddress,
    ClientContact,
)
from apps.clients.serializers.client.client_type_profile_serializer import (
    serialize_client_type_profile,
)


class ClientAddressSerializer(
    serializers.ModelSerializer
):

    class Meta:
        model = ClientAddress
        fields = "__all__"


class ClientContactSerializer(
    serializers.ModelSerializer
):

    class Meta:
        model = ClientContact
        fields = "__all__"


class ClientDetailSerializer(
    serializers.ModelSerializer
):

    type_profile = serializers.SerializerMethodField()

    addresses = ClientAddressSerializer(
        many=True,
        read_only=True,
    )

    contacts = ClientContactSerializer(
        many=True,
        read_only=True,
    )

    cases = serializers.SerializerMethodField()

    class Meta:
        model = Client

        fields = [
            "id",
            "full_name",
            "email",
            "phone_number",
            "national_id",
            "passport_number",
            "kra_pin",
            "date_of_birth",

            "client_type",
            "access_type",
            "lifecycle_status",
            "is_active",

            "created_at",
            "updated_at",

            "type_profile",
            "addresses",
            "contacts",

            # Future-ready
            "cases",
        ]

    def get_type_profile(
        self,
        obj,
    ):
        return serialize_client_type_profile(obj)

    def get_cases(
        self,
        obj,
    ):
        """
        Placeholder until Cases module exists.
        """
        return []
