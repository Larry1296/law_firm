from django.utils import timezone
from rest_framework import serializers

from apps.clients.models import Client, CompanyClient
from apps.clients.serializers.admin.admin_client_base_create_serializer import (
    AdminClientBaseCreateSerializer,
)
from apps.users.models import User


class CompanyAdminCreateClientSerializer(AdminClientBaseCreateSerializer):
    company_name = serializers.CharField(max_length=255)
    trading_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    registration_number = serializers.CharField(max_length=100)
    company_type = serializers.ChoiceField(
        choices=CompanyClient.CompanyType.choices,
        default=CompanyClient.CompanyType.PRIVATE_LIMITED,
    )
    incorporation_date = serializers.DateField(required=False, allow_null=True)
    country_of_incorporation = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        default="Kenya",
    )
    industry = serializers.CharField(max_length=150, required=False, allow_blank=True)
    nature_of_business = serializers.CharField(required=False, allow_blank=True)
    website = serializers.URLField(required=False, allow_blank=True)
    company_status = serializers.ChoiceField(
        choices=CompanyClient.CompanyStatus.choices,
        default=CompanyClient.CompanyStatus.ACTIVE,
    )
    director_count = serializers.IntegerField(required=False, min_value=0, default=0)
    employee_count = serializers.IntegerField(required=False, min_value=0, allow_null=True)
    beneficial_ownership_declared = serializers.BooleanField(required=False, default=False)
    annual_returns_up_to_date = serializers.BooleanField(required=False, default=False)
    compliance_notes = serializers.CharField(required=False, allow_blank=True)

    def validate_company_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Company name is required.")
        return value

    def validate_registration_number(self, value):
        value = value.strip().upper()
        if not value:
            raise serializers.ValidationError("Registration number is required.")

        if CompanyClient.objects.filter(registration_number__iexact=value).exists():
            raise serializers.ValidationError(
                "A company client with this registration number already exists."
            )
        return value

    def validate_incorporation_date(self, value):
        if value and value > timezone.localdate():
            raise serializers.ValidationError(
                "The incorporation date cannot be in the future."
            )
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)

        attrs["country_of_incorporation"] = (
            attrs.get("country_of_incorporation") or "Kenya"
        ).strip()
        attrs["company_type"] = attrs.get(
            "company_type",
            CompanyClient.CompanyType.PRIVATE_LIMITED,
        )
        attrs["company_status"] = attrs.get(
            "company_status",
            CompanyClient.CompanyStatus.ACTIVE,
        )

        if attrs.get("access_type") == Client.AccessType.PROSPECT:
            errors = {}
            email = attrs.get("email")
            phone_number = attrs.get("phone_number")
            contact_phone_number = attrs.get("contact_phone_number")
            contact_full_name = (attrs.get("contact_full_name") or "").strip()

            if not email:
                errors["email"] = "Client portal access requires the company login email."
            elif User.objects.filter(email__iexact=email).exists():
                errors["email"] = "A user account with this email already exists."

            if not (phone_number or contact_phone_number):
                errors["phone_number"] = (
                    "Client portal access requires a company phone number or "
                    "authorised contact phone number."
                )

            if not contact_full_name:
                errors["contact_full_name"] = (
                    "Client portal access requires an authorised contact full name."
                )

            if errors:
                raise serializers.ValidationError(errors)

        return attrs
