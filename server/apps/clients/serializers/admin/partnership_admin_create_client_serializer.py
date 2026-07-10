from rest_framework import serializers

from apps.clients.models import PartnershipClient
from apps.clients.serializers.admin.admin_client_base_create_serializer import (
    AdminClientBaseCreateSerializer,
)


class PartnershipAdminCreateClientSerializer(AdminClientBaseCreateSerializer):
    partnership_name = serializers.CharField(max_length=255)
    registration_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    tax_pin = serializers.CharField(max_length=100, required=False, allow_blank=True)
    formation_date = serializers.DateField(required=False, allow_null=True)
    partner_count = serializers.IntegerField(required=False, min_value=0, default=0)
    agreement_type = serializers.ChoiceField(
        choices=PartnershipClient.AgreementType.choices,
        required=False,
        allow_blank=True,
    )
