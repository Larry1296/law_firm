from rest_framework import serializers

from apps.clients.models import CompanyClient
from apps.clients.serializers.admin.admin_client_base_create_serializer import (
    AdminClientBaseCreateSerializer,
)


class CompanyAdminCreateClientSerializer(AdminClientBaseCreateSerializer):
    company_name = serializers.CharField(max_length=255)
    registration_number = serializers.CharField(max_length=100)
    incorporation_date = serializers.DateField(required=False, allow_null=True)
    country_of_incorporation = serializers.CharField(max_length=100, required=False, allow_blank=True)
    industry = serializers.CharField(max_length=100, required=False, allow_blank=True)
    company_status = serializers.ChoiceField(
        choices=CompanyClient.CompanyStatus.choices,
        default=CompanyClient.CompanyStatus.ACTIVE,
    )
    director_count = serializers.IntegerField(required=False, min_value=0, default=0)

    def validate_registration_number(self, value):
        if CompanyClient.objects.filter(registration_number=value).exists():
            raise serializers.ValidationError(
                "A company client with this registration number already exists."
            )
        return value
