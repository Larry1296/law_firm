from rest_framework import serializers

from apps.clients.models import IndividualClient
from apps.clients.serializers.admin.admin_client_base_create_serializer import (
    AdminClientBaseCreateSerializer,
)


class IndividualAdminCreateClientSerializer(AdminClientBaseCreateSerializer):
    full_name = serializers.CharField(max_length=255)
    gender = serializers.ChoiceField(
        choices=IndividualClient.Gender.choices,
        required=False,
        allow_null=True,
    )
    occupation = serializers.CharField(max_length=255, required=False, allow_blank=True)
    marital_status = serializers.ChoiceField(
        choices=IndividualClient.MaritalStatus.choices,
        required=False,
        allow_null=True,
    )

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if not attrs.get("national_id") and not attrs.get("passport_number"):
            raise serializers.ValidationError(
                {"identification": "Either national_id or passport_number is required."}
            )
        return attrs
