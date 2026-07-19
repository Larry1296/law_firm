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
    registered_address = serializers.SerializerMethodField()
    primary_address = serializers.SerializerMethodField()
    primary_contact = serializers.SerializerMethodField()
    next_of_kin = serializers.SerializerMethodField()
    portal_access_exists = serializers.SerializerMethodField()
    portal_login_email = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    has_cases = serializers.BooleanField(read_only=True)
    can_hard_delete = serializers.BooleanField(read_only=True)
    can_archive = serializers.BooleanField(read_only=True)
    can_restore = serializers.BooleanField(read_only=True)

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
            "is_verified",
            "is_active",
            "created_by",
            "created_by_name",
            "has_cases",
            "can_hard_delete",
            "can_archive",
            "can_restore",
            "soft_deleted_at",

            "created_at",
            "updated_at",

            "type_profile",
            "registered_address",
            "primary_address",
            "primary_contact",
            "next_of_kin",
            "portal_access_exists",
            "portal_login_email",
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

    def get_registered_address(self, obj):
        address = (
            obj.addresses.filter(address_type=ClientAddress.AddressType.REGISTERED)
            .order_by("-is_primary", "-created_at")
            .first()
        )
        return ClientAddressSerializer(address).data if address else None

    def get_primary_address(self, obj):
        address = obj.addresses.order_by("-is_primary", "-created_at").first()
        return ClientAddressSerializer(address).data if address else None

    def get_primary_contact(self, obj):
        contact = obj.contacts.filter(is_primary=True).order_by("-created_at").first()
        return ClientContactSerializer(contact).data if contact else None

    def get_next_of_kin(self, obj):
        contact = obj.contacts.filter(contact_type="EMERGENCY").order_by("-created_at").first()
        return ClientContactSerializer(contact).data if contact else None

    def get_portal_access_exists(self, obj):
        return bool(obj.user_id)

    def get_portal_login_email(self, obj):
        return obj.user.email if obj.user_id else None

    def get_created_by_name(self, obj):
        return obj.created_by.full_name if obj.created_by_id else None

    def get_cases(
        self,
        obj,
    ):
        """
        Placeholder until Cases module exists.
        """
        return []
