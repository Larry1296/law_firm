from rest_framework import serializers

from apps.clients.models import Client


class ClientAdminListSerializer(serializers.ModelSerializer):
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
            "is_active",
            "created_at",
        )
        read_only_fields = fields
