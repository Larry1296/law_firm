from rest_framework import serializers
from apps.clients.models import Client


class ClientSerializer(serializers.ModelSerializer):

    class Meta:
        model = Client

        fields = (
            "id",
            "full_name",
            "client_type",
            "lifecycle_status",
            "is_active",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "lifecycle_status",
            "created_at",
            "updated_at",
        )