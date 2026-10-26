from rest_framework import serializers

from apps.authentication.serializers.register_firm_serializer import (
    KRA_PIN_PATTERN,
    AdminSerializer,
    FirmSerializer,
)
from apps.firm.models import LawFirm
from apps.firm.serializers.logo_serializer import LogoSerializer
from apps.platform_admin.models import FirmOnboardingRequest
from apps.platform_admin.reference_data import KENYAN_COUNTIES
from apps.platform_admin.services.firm_onboarding_service import OnboardingStart
from apps.subscriptions.catalog import Feature
from apps.subscriptions.models import FirmSubscription, Plan
from apps.subscriptions.services import MPESA_RECEIPT_PATTERN


def _county(value):
    value = (value or "").strip()
    if value and value not in KENYAN_COUNTIES:
        raise serializers.ValidationError("Choose one of Kenya's 47 counties.")
    return value


# ---------------------------------------------------------------------------
# Registering a firm
# ---------------------------------------------------------------------------

class OnboardingFirmSerializer(FirmSerializer):
    kra_pin = serializers.CharField(max_length=20)
    phone_number = serializers.CharField(max_length=30)
    physical_address = serializers.CharField()
    county = serializers.CharField(max_length=60)
    town = serializers.CharField(max_length=100)

    def validate_county(self, value):
        return _county(value)


class OnboardingOwnerSerializer(AdminSerializer):
    """The firm owner. They set their own password from the invitation link."""

    password = None
    confirm_password = None
    job_title = serializers.CharField(max_length=100, required=False, allow_blank=True)
    office_location = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate(self, data):
        return data


class OfficeSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=30, required=False, allow_blank=True)
    physical_address = serializers.CharField(required=False, allow_blank=True)
    postal_address = serializers.CharField(max_length=255, required=False, allow_blank=True)


class FirmSettingsInputSerializer(serializers.Serializer):
    queue_reception_mode = serializers.ChoiceField(choices=['SHARED', 'ASSIGNED'], required=False)
    opening_time = serializers.TimeField(required=False)
    closing_time = serializers.TimeField(required=False)
    work_on_saturday = serializers.BooleanField(required=False)
    allow_client_registration = serializers.BooleanField(required=False)

    def validate(self, data):
        opening, closing = data.get("opening_time"), data.get("closing_time")
        if opening and closing and closing <= opening:
            raise serializers.ValidationError({"closing_time": "Closing time must be after opening time."})
        return data


class OnboardingSubscriptionSerializer(serializers.Serializer):
    plan_code = serializers.CharField()
    billing_cycle = serializers.ChoiceField(
        choices=FirmSubscription.BillingCycle.choices, default=FirmSubscription.BillingCycle.MONTHLY,
    )
    start = serializers.ChoiceField(choices=OnboardingStart.CHOICES, default=OnboardingStart.TRIAL)
    trial_days = serializers.IntegerField(min_value=1, max_value=90, required=False)
    mpesa_receipt = serializers.CharField(max_length=20, required=False, allow_blank=True)
    payer_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def validate_plan_code(self, value):
        if not Plan.objects.filter(code=value, is_active=True).exists():
            raise serializers.ValidationError("Choose an available plan.")
        return value

    def validate(self, data):
        if data["start"] == OnboardingStart.PAID:
            receipt = (data.get("mpesa_receipt") or "").strip().upper()
            if not MPESA_RECEIPT_PATTERN.match(receipt):
                raise serializers.ValidationError({
                    "mpesa_receipt": "Enter the 10-character M-Pesa confirmation code for the payment received.",
                })
            data["mpesa_receipt"] = receipt
        return data


class RegisterFirmSerializer(serializers.Serializer):
    firm = OnboardingFirmSerializer()
    owner = OnboardingOwnerSerializer()
    office = OfficeSerializer(required=False)
    practice_areas = serializers.ListField(
        child=serializers.CharField(max_length=255), allow_empty=False,
        error_messages={"empty": "Add at least one practice area."},
    )
    settings = FirmSettingsInputSerializer(required=False)
    subscription = OnboardingSubscriptionSerializer()
    onboarding_request_id = serializers.UUIDField(required=False, allow_null=True)


# ---------------------------------------------------------------------------
# Managing firms
# ---------------------------------------------------------------------------

class FirmProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LawFirm
        fields = [
            "name", "business_structure", "registration_number", "kra_pin", "email", "phone_number",
            "website", "physical_address", "postal_address", "county", "town", "description",
        ]

    def validate_name(self, value):
        value = value.strip()
        if LawFirm.objects.filter(name__iexact=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError("A firm with this name is already registered.")
        return value

    def validate_registration_number(self, value):
        value = value.strip()
        if LawFirm.objects.filter(registration_number__iexact=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError("A firm with this registration number is already registered.")
        return value

    def validate_kra_pin(self, value):
        value = (value or "").strip().upper()
        if value and not KRA_PIN_PATTERN.match(value):
            raise serializers.ValidationError("Enter a valid KRA PIN, e.g. P051234567X.")
        return value

    def validate_county(self, value):
        return _county(value)


class FirmStatusSerializer(serializers.Serializer):
    is_active = serializers.BooleanField()
    reason = serializers.CharField(max_length=300, required=False, allow_blank=True)


class SubscriptionUpdateSerializer(serializers.Serializer):
    plan_code = serializers.CharField(required=False)
    billing_cycle = serializers.ChoiceField(choices=FirmSubscription.BillingCycle.choices, required=False)
    status = serializers.ChoiceField(choices=FirmSubscription.Status.choices, required=False)
    trial_ends_at = serializers.DateTimeField(required=False, allow_null=True)
    current_period_end = serializers.DateTimeField(required=False, allow_null=True)
    grace_period_days = serializers.IntegerField(min_value=0, max_value=60, required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    is_complimentary = serializers.BooleanField(required=False)
    custom_monthly_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0, required=False, allow_null=True)
    custom_annual_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0, required=False, allow_null=True)
    pricing_reason = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate_plan_code(self, value):
        if not Plan.objects.filter(code=value, is_active=True).exists():
            raise serializers.ValidationError("Choose an available plan.")
        return value


# ---------------------------------------------------------------------------
# Plans
# ---------------------------------------------------------------------------

class PlanSerializer(serializers.ModelSerializer):
    subscriber_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Plan
        fields = [
            "id", "code", "name", "tagline", "monthly_price", "annual_price", "pricing_basis",
            "max_advocates", "max_support_staff", "max_active_matters", "max_branches",
            "features", "is_public", "is_active", "sort_order", "subscriber_count",
        ]
        read_only_fields = ["id", "subscriber_count"]

    def validate_code(self, value):
        value = value.strip().upper().replace(" ", "_")
        if self.instance is not None and value != self.instance.code:
            raise serializers.ValidationError("A plan's code cannot change once it exists.")
        if self.instance is None and Plan.objects.filter(code=value).exists():
            raise serializers.ValidationError("A plan with this code already exists.")
        return value

    def validate_features(self, value):
        unknown = sorted(set(value) - set(Feature.ALL))
        if unknown:
            raise serializers.ValidationError(f"Unknown features: {', '.join(unknown)}.")
        return [code for code in Feature.ALL if code in value]


# ---------------------------------------------------------------------------
# Users and onboarding requests
# ---------------------------------------------------------------------------

class UserStatusSerializer(serializers.Serializer):
    is_active = serializers.BooleanField()


class OnboardingRequestCreateSerializer(serializers.Serializer):
    """Everything the platform needs to register the firm, so the request only has to be confirmed."""

    firm = OnboardingFirmSerializer()
    owner = OnboardingOwnerSerializer()
    settings = FirmSettingsInputSerializer(required=False)
    practice_areas = serializers.ListField(
        child=serializers.CharField(max_length=255), allow_empty=False,
        error_messages={"empty": "Add at least one practice area."},
    )
    preferred_plan = serializers.CharField(max_length=30, required=False, allow_blank=True)
    advocates_count = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    message = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    logo = serializers.ImageField(required=False, allow_null=True)

    def validate_preferred_plan(self, value):
        if value and not Plan.objects.filter(code=value, is_active=True, is_public=True).exists():
            raise serializers.ValidationError("Choose an available plan.")
        return value

    def validate_logo(self, value):
        return LogoSerializer().validate_logo(value) if value else value

    def create(self, validated_data):
        firm, owner = validated_data["firm"], validated_data["owner"]
        details = self.to_representation({
            key: validated_data[key] for key in ("firm", "owner", "settings", "practice_areas") if key in validated_data
        })
        return FirmOnboardingRequest.objects.create(
            firm_name=firm["name"],
            contact_name=f"{owner['first_name']} {owner['last_name']}".strip(),
            email=owner["email"],
            phone_number=owner["phone_number"],
            county=firm.get("county", ""),
            advocates_count=validated_data.get("advocates_count"),
            preferred_plan=validated_data.get("preferred_plan", ""),
            message=validated_data.get("message", ""),
            details=details,
            logo=validated_data.get("logo"),
        )


class OnboardingRequestSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    registered_firm_name = serializers.CharField(source="registered_firm.name", read_only=True, default=None)
    has_logo = serializers.SerializerMethodField()

    def get_has_logo(self, obj):
        return bool(obj.logo)

    class Meta:
        model = FirmOnboardingRequest
        fields = [
            "id", "firm_name", "contact_name", "email", "phone_number", "county", "advocates_count",
            "preferred_plan", "message", "details", "has_logo", "status", "status_label", "internal_notes",
            "registered_firm", "registered_firm_name", "created_at",
        ]
        read_only_fields = [
            "id", "firm_name", "contact_name", "email", "phone_number", "county", "advocates_count",
            "preferred_plan", "message", "details", "registered_firm", "created_at",
        ]
