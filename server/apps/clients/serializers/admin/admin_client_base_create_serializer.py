from rest_framework import serializers

from apps.clients.models import Client
from apps.clients.kenya_locations import KENYA_COUNTIES
from apps.users.models import User


class AdminClientBaseCreateSerializer(serializers.Serializer):
    full_name = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
    )

    email = serializers.EmailField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    phone_number = serializers.CharField(
        max_length=30,
        required=False,
        allow_blank=True,
    )

    access_type = serializers.ChoiceField(
        choices=Client.AccessType.choices,
        default=Client.AccessType.ASSISTED,
    )

    national_id = serializers.CharField(
        max_length=50,
        required=False,
        allow_blank=True,
    )

    passport_number = serializers.CharField(
        max_length=50,
        required=False,
        allow_blank=True,
    )

    kra_pin = serializers.CharField(
        max_length=50,
        required=False,
        allow_blank=True,
    )

    date_of_birth = serializers.DateField(
        required=False,
        allow_null=True,
    )

    country = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
    )

    county = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
    )

    city = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
    )

    street = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
    )

    postal_code = serializers.CharField(
        max_length=50,
        required=False,
        allow_blank=True,
    )

    full_address = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    contact_full_name = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
    )

    contact_role_or_designation = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
    )

    contact_email = serializers.EmailField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    contact_phone_number = serializers.CharField(
        max_length=30,
        required=False,
        allow_blank=True,
    )

    contact_national_id_number = serializers.CharField(
        max_length=50,
        required=False,
        allow_blank=True,
    )

    def validate(self, attrs):
        access_type = attrs.get(
            "access_type",
            Client.AccessType.ASSISTED,
        )
        access_type = {
            Client.AccessType.ASSISTED_CLIENT: Client.AccessType.ASSISTED,
            Client.AccessType.PROSPECT: Client.AccessType.PORTAL_ENABLED,
        }.get(access_type, access_type)
        attrs["access_type"] = access_type

        if (attrs.get("country") or "").strip().casefold() == "kenya":
            county = (attrs.get("county") or "").strip()
            if county and county not in KENYA_COUNTIES:
                raise serializers.ValidationError(
                    {"county": "Select one of Kenya's 47 official counties."}
                )

        if (
            access_type == Client.AccessType.PORTAL_ENABLED
            and not attrs.get("email")
        ):
            raise serializers.ValidationError(
                {
                    "email": "Portal-enabled clients require a login email."
                }
            )

        if (
            access_type == Client.AccessType.PORTAL_ENABLED
            and not (
                attrs.get("phone_number")
                or attrs.get("contact_phone_number")
            )
        ):
            raise serializers.ValidationError(
                {
                    "phone_number": (
                        "Portal-enabled clients require a phone number."
                    )
                }
            )

        if access_type == Client.AccessType.PORTAL_ENABLED:
            phone_number = (
                attrs.get("phone_number")
                or attrs.get("contact_phone_number")
            )
            national_id_number = (
                attrs.get("national_id")
                or attrs.get("passport_number")
                or attrs.get("contact_national_id_number")
            )
            errors = {}
            if phone_number and User.objects.filter(
                phone_number=phone_number
            ).exists():
                errors["phone_number"] = (
                    "A user account with this phone number already exists."
                )
            if national_id_number and User.objects.filter(
                national_id_number=national_id_number[:20]
            ).exists():
                errors["national_id"] = (
                    "A user account with this ID or passport number already exists."
                )
            if errors:
                raise serializers.ValidationError(errors)

        return attrs
