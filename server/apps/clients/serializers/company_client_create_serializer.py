from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.clients.models import CompanyClient

User = get_user_model()


class CompanyClientCreateSerializer(serializers.Serializer):
    """
    Company Client creation:
    - Client (base)
    - Company profile
    - Address (required)
    - Primary contact (required)
    - Portal user (required)
    """

    # =====================================================
    # Shared Client Information
    # =====================================================

    email = serializers.EmailField()

    phone_number = serializers.CharField(
        max_length=30,
        required=False,
        allow_blank=True,
    )

    # =====================================================
    # Company Profile
    # =====================================================

    company_name = serializers.CharField(
        max_length=255,
    )

    registration_number = serializers.CharField(
        max_length=100,
    )

    incorporation_date = serializers.DateField(
        required=False,
        allow_null=True,
    )

    country_of_incorporation = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    industry = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    company_status = serializers.ChoiceField(
        choices=CompanyClient.CompanyStatus.choices,
        required=False,
        default=CompanyClient.CompanyStatus.ACTIVE,
    )

    # =====================================================
    # Registered Address
    # =====================================================

    country = serializers.CharField()

    county = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    city = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    street = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    postal_code = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    full_address = serializers.CharField()

    # =====================================================
    # Primary Contact / Portal User
    # =====================================================

    contact_full_name = serializers.CharField()

    contact_role_or_designation = serializers.CharField(
        required=False,
        allow_blank=True,
        default="Authorized Representative",
    )

    contact_email = serializers.EmailField()

    contact_phone_number = serializers.CharField(
        max_length=30,
    )

    contact_national_id_number = serializers.CharField(
        max_length=20,
    )

    # =====================================================
    # Validation
    # =====================================================

    def validate_registration_number(self, value):
        if CompanyClient.objects.filter(
            registration_number=value
        ).exists():
            raise serializers.ValidationError(
                "A company with this registration number already exists."
            )
        return value

    def validate_contact_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "A user with this email already exists."
            )
        return value

    def validate_contact_phone_number(self, value):
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError(
                "A user with this phone number already exists."
            )
        return value

    def validate_contact_national_id_number(self, value):
        if User.objects.filter(
            national_id_number=value
        ).exists():
            raise serializers.ValidationError(
                "A user with this national ID number already exists."
            )
        return value
