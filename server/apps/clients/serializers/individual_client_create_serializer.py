from rest_framework import serializers

from apps.clients.models import Client, IndividualClient


class IndividualClientCreateSerializer(serializers.Serializer):

    # ==================================
    # Client
    # ==================================

    full_name = serializers.CharField(
        max_length=255
    )

    national_id = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    passport_number = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    email = serializers.EmailField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    phone_number = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    kra_pin = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    date_of_birth = serializers.DateField(
        required=False,
        allow_null=True,
    )

    # ==================================
    # Individual Profile
    # ==================================

    gender = serializers.ChoiceField(
        choices=IndividualClient.Gender.choices,
        required=False,
    )

    occupation = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    marital_status = serializers.ChoiceField(
        choices=IndividualClient.MaritalStatus.choices,
        required=False,
    )

    # ==================================
    # Address (Optional)
    # ==================================

    country = serializers.CharField(
        required=False,
        allow_blank=True,
    )

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

    full_address = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    def validate(self, attrs):

        national_id = attrs.get("national_id")
        passport_number = attrs.get("passport_number")

        if not national_id and not passport_number:
            raise serializers.ValidationError(
                {
                    "non_field_errors": [
                        "Either national_id or passport_number is required."
                    ]
                }
            )

        access_type = attrs.get("access_type")

        if (
            access_type ==
            Client.AccessType.PORTAL_CLIENT
        ):
            email = attrs.get("email")

            if not email:
                raise serializers.ValidationError(
                    {
                        "email": [
                            "Portal clients require an email address."
                        ]
                    }
                )

        return attrs