from rest_framework import serializers

from apps.clients.models import Client


class SecretaryClientSerializer(serializers.ModelSerializer):
    client_id = serializers.CharField(source="id", read_only=True)
    is_represented = serializers.SerializerMethodField()
    last_updated = serializers.DateTimeField(source="updated_at", read_only=True)

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
            "created_at",
            "last_updated",
        ]

    def get_is_represented(self, obj):
        return obj.lifecycle_status == Client.LifecycleStatus.OFFICIAL_CLIENT
