import re

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.firm.models import LawFirm
from apps.subscriptions.models import Plan
from apps.users.models import User

KRA_PIN_PATTERN = re.compile(r"^[AP]\d{9}[A-Z]$")


class FirmSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    registration_number = serializers.CharField(
        max_length=100,
        help_text="Business Registration Service number for the firm (business name or partnership).",
    )
    email = serializers.EmailField()
    phone_number = serializers.CharField(required=False, allow_blank=True, max_length=30)
    kra_pin = serializers.CharField(required=False, allow_blank=True, max_length=20)
    physical_address = serializers.CharField(required=False, allow_blank=True)
    business_structure = serializers.ChoiceField(
        choices=LawFirm.BusinessStructure.choices, default=LawFirm.BusinessStructure.PARTNERSHIP,
    )
    postal_address = serializers.CharField(required=False, allow_blank=True, max_length=255)
    county = serializers.CharField(required=False, allow_blank=True, max_length=60)
    town = serializers.CharField(required=False, allow_blank=True, max_length=100)
    website = serializers.URLField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)

    def validate_name(self, value):
        if LawFirm.objects.filter(name__iexact=value.strip()).exists():
            raise serializers.ValidationError("A firm with this name is already registered.")
        return value.strip()

    def validate_registration_number(self, value):
        if LawFirm.objects.filter(registration_number__iexact=value.strip()).exists():
            raise serializers.ValidationError("A firm with this registration number is already registered.")
        return value.strip()

    def validate_kra_pin(self, value):
        value = (value or "").strip().upper()
        if value and not KRA_PIN_PATTERN.match(value):
            raise serializers.ValidationError("Enter a valid KRA PIN, e.g. P051234567X.")
        return value


class AdminSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    phone_number = serializers.CharField(max_length=20)
    national_id_number = serializers.CharField(max_length=20)
    admission_number = serializers.CharField(
        max_length=50,
        help_text="Roll of Advocates admission number of the managing partner, e.g. P.105/1234/15.",
    )
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_phone_number(self, value):
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("An account with this phone number already exists.")
        return value

    def validate_national_id_number(self, value):
        if User.objects.filter(national_id_number=value).exists():
            raise serializers.ValidationError("An account with this national ID already exists.")
        return value

    def validate(self, data):
        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        validate_password(data["password"])
        return data


class RegisterFirmSerializer(serializers.Serializer):
    firm = FirmSerializer()
    admin = AdminSerializer()
    plan_code = serializers.CharField(required=False, allow_blank=True)

    def validate_plan_code(self, value):
        if value and not Plan.objects.filter(code=value, is_active=True, is_public=True).exists():
            raise serializers.ValidationError("Choose an available plan.")
        return value
