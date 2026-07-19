from django.utils import timezone
from rest_framework import serializers

from apps.clients.models import Client, IndividualClient
from apps.clients.serializers.admin.admin_client_base_create_serializer import (
    AdminClientBaseCreateSerializer,
)
from apps.users.models import User


class IndividualAdminCreateClientSerializer(AdminClientBaseCreateSerializer):
    full_name = serializers.CharField(max_length=255)
    first_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    middle_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    preferred_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    gender = serializers.ChoiceField(
        choices=IndividualClient.Gender.choices,
        required=False,
        allow_null=True,
        allow_blank=True,
    )
    occupation = serializers.CharField(max_length=255, required=False, allow_blank=True)
    marital_status = serializers.ChoiceField(
        choices=IndividualClient.MaritalStatus.choices,
        required=False,
        allow_null=True,
        allow_blank=True,
    )
    employer = serializers.CharField(max_length=255, required=False, allow_blank=True)
    nationality = serializers.CharField(max_length=100, required=False, allow_blank=True)
    citizenship = serializers.CharField(max_length=100, required=False, allow_blank=True)
    county_of_residence = serializers.CharField(max_length=100, required=False, allow_blank=True)
    physical_address = serializers.CharField(required=False, allow_blank=True)
    postal_address = serializers.CharField(required=False, allow_blank=True)
    preferred_language = serializers.CharField(max_length=50, required=False, allow_blank=True)
    preferred_contact_channel = serializers.CharField(max_length=20, required=False, allow_blank=True)
    disability_or_accessibility_notes = serializers.CharField(required=False, allow_blank=True)
    next_of_kin_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    next_of_kin_relationship = serializers.CharField(max_length=100, required=False, allow_blank=True)
    next_of_kin_phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    next_of_kin_email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    next_of_kin_national_id = serializers.CharField(max_length=50, required=False, allow_blank=True)
    next_of_kin_physical_address = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def _normalize(self, attrs):
        string_fields = [
            "full_name",
            "first_name",
            "middle_name",
            "last_name",
            "preferred_name",
            "national_id",
            "passport_number",
            "kra_pin",
            "phone_number",
            "occupation",
            "employer",
            "nationality",
            "citizenship",
            "county_of_residence",
            "physical_address",
            "postal_address",
            "preferred_language",
            "preferred_contact_channel",
            "next_of_kin_name",
            "next_of_kin_relationship",
            "next_of_kin_phone",
            "next_of_kin_national_id",
            "next_of_kin_physical_address",
        ]
        for field in string_fields:
            if field in attrs and attrs[field] is not None:
                attrs[field] = str(attrs[field]).strip()

        for field in ["email", "contact_email", "next_of_kin_email"]:
            if attrs.get(field):
                attrs[field] = attrs[field].strip().lower()

        if attrs.get("kra_pin"):
            attrs["kra_pin"] = attrs["kra_pin"].upper()
        if attrs.get("passport_number"):
            attrs["passport_number"] = attrs["passport_number"].upper()

        if not attrs.get("nationality"):
            attrs["nationality"] = "Kenyan"
        if not attrs.get("citizenship"):
            attrs["citizenship"] = "Kenya"

        return attrs

    def validate(self, attrs):
        attrs = self._normalize(attrs)
        attrs = super().validate(attrs)
        firm = self.context.get("firm")
        access_type = attrs.get("access_type", Client.AccessType.ASSISTED_CLIENT)

        if access_type not in {
            Client.AccessType.PROSPECT,
            Client.AccessType.ASSISTED_CLIENT,
        }:
            raise serializers.ValidationError(
                {"access_type": "Individual clients must be portal or assisted clients."}
            )

        if not attrs.get("full_name", "").strip():
            raise serializers.ValidationError({"full_name": "Full legal name is required."})

        if not attrs.get("national_id") and not attrs.get("passport_number"):
            raise serializers.ValidationError(
                {"identification": "Either national_id or passport_number is required."}
            )
        if access_type == Client.AccessType.PROSPECT:
            if not attrs.get("email"):
                raise serializers.ValidationError(
                    {"email": "Portal individual clients require a login email address."}
                )
            if not attrs.get("phone_number"):
                raise serializers.ValidationError(
                    {"phone_number": "Portal individual clients require a phone number."}
                )

        if attrs.get("date_of_birth") and attrs["date_of_birth"] > timezone.localdate():
            raise serializers.ValidationError(
                {"date_of_birth": "Date of birth cannot be in the future."}
            )

        if attrs.get("kra_pin") and len(attrs["kra_pin"]) < 8:
            raise serializers.ValidationError({"kra_pin": "Enter a valid KRA PIN."})

        if firm:
            duplicate_checks = [
                ("national_id", "An individual client with this National ID already exists."),
                ("passport_number", "An individual client with this passport number already exists."),
                ("kra_pin", "An individual client with this KRA PIN already exists."),
            ]
            errors = {}
            for field, message in duplicate_checks:
                value = attrs.get(field)
                if not value:
                    continue
                exists = Client.objects.filter(
                    firm=firm,
                    client_type=Client.ClientType.INDIVIDUAL,
                    **{f"{field}__iexact": value},
                ).exists()
                if exists:
                    errors[field] = message

            email = attrs.get("email")
            if access_type == Client.AccessType.PROSPECT and email:
                if User.objects.filter(email__iexact=email).exists():
                    errors["email"] = "This email already has portal access."
                elif Client.objects.filter(
                    firm=firm,
                    email__iexact=email,
                    user__isnull=False,
                ).exists():
                    errors["email"] = "This email is already linked to a portal client."

            if errors:
                raise serializers.ValidationError(errors)

        return attrs
