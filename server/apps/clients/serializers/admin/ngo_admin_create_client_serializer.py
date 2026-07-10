from rest_framework import serializers

from apps.clients.models import NGOClient
from apps.clients.serializers.admin.admin_client_base_create_serializer import (
    AdminClientBaseCreateSerializer,
)


class NGOAdminCreateClientSerializer(AdminClientBaseCreateSerializer):
    ngo_name = serializers.CharField(max_length=255)
    registration_number = serializers.CharField(max_length=100)
    tax_pin = serializers.CharField(max_length=100, required=False, allow_blank=True)
    registration_authority = serializers.CharField(max_length=255, required=False, allow_blank=True)
    registration_date = serializers.DateField(required=False, allow_null=True)
    sector = serializers.CharField(max_length=100, required=False, allow_blank=True)
    headquarters_address = serializers.CharField(required=False, allow_blank=True)
    operational_regions = serializers.CharField(required=False, allow_blank=True)
    director_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    director_contact = serializers.CharField(max_length=30, required=False, allow_blank=True)
    funding_sources = serializers.CharField(required=False, allow_blank=True)

    def validate_registration_number(self, value):
        if NGOClient.objects.filter(registration_number=value).exists():
            raise serializers.ValidationError(
                "An NGO client with this registration number already exists."
            )
        return value
