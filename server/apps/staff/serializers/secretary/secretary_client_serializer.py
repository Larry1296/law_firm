from rest_framework import serializers

from apps.clients.models import Client
from apps.clients.serializers.client_detail_serializer import (
    ClientAddressSerializer,
    ClientContactSerializer,
)
from apps.clients.serializers.client.client_type_profile_serializer import (
    serialize_client_type_profile,
)


class SecretaryClientSerializer(serializers.ModelSerializer):
    client_id = serializers.CharField(source="id", read_only=True)
    is_represented = serializers.SerializerMethodField()
    last_updated = serializers.DateTimeField(source="updated_at", read_only=True)
    type_profile = serializers.SerializerMethodField()
    addresses = ClientAddressSerializer(many=True, read_only=True)
    contacts = ClientContactSerializer(many=True, read_only=True)
    primary_contact = serializers.SerializerMethodField()
    primary_address = serializers.SerializerMethodField()
    next_of_kin = serializers.SerializerMethodField()
    portal_access_exists = serializers.SerializerMethodField()
    portal_login_email = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            "id",
            "client_id",
            "full_name",
            "client_type",
            "phone_number",
            "email",
            "national_id",
            "access_type",
            "lifecycle_status",
            "is_represented",
            "kra_pin",
            "passport_number",
            "date_of_birth",
            "type_profile",
            "addresses",
            "contacts",
            "primary_contact",
            "primary_address",
            "next_of_kin",
            "portal_access_exists",
            "portal_login_email",
            "created_at",
            "last_updated",
        ]

    def get_is_represented(self, obj):
        return obj.lifecycle_status == Client.LifecycleStatus.OFFICIAL_CLIENT

    def get_type_profile(self, obj):
        return serialize_client_type_profile(obj)

    def get_primary_contact(self, obj):
        contact = obj.contacts.filter(is_primary=True).order_by("-created_at").first()
        return ClientContactSerializer(contact).data if contact else None

    def get_primary_address(self, obj):
        address = obj.addresses.order_by("-is_primary", "-created_at").first()
        return ClientAddressSerializer(address).data if address else None

    def get_next_of_kin(self, obj):
        contact = obj.contacts.filter(contact_type="EMERGENCY").order_by("-created_at").first()
        return ClientContactSerializer(contact).data if contact else None

    def get_portal_access_exists(self, obj):
        return bool(obj.user_id)

    def get_portal_login_email(self, obj):
        return obj.user.email if obj.user_id else None
