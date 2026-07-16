from rest_framework import serializers

from apps.clients.models import Client


class ClientAdminListSerializer(serializers.ModelSerializer):
    has_cases = serializers.BooleanField(read_only=True)
    can_hard_delete = serializers.BooleanField(read_only=True)
    can_archive = serializers.BooleanField(read_only=True)
    can_restore = serializers.BooleanField(read_only=True)

    class Meta:
        model = Client
        fields = (
            "id",
            "full_name",
            "email",
            "phone_number",
            "national_id",
            "client_type",
            "access_type",
            "lifecycle_status",
            "is_verified",
            "is_active",
            "has_cases",
            "can_hard_delete",
            "can_archive",
            "can_restore",
            "soft_deleted_at",
            "created_at",
        )
        read_only_fields = fields
