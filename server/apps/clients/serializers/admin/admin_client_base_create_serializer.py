from rest_framework import serializers

from apps.clients.models import Client


class AdminClientBaseCreateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    phone_number = serializers.CharField(max_length=30, required=False, allow_blank=True)
    access_type = serializers.ChoiceField(
        choices=Client.AccessType.choices,
        default=Client.AccessType.ASSISTED_CLIENT,
    )
    national_id = serializers.CharField(max_length=50, required=False, allow_blank=True)
    passport_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    kra_pin = serializers.CharField(max_length=50, required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)

    country = serializers.CharField(max_length=100, required=False, allow_blank=True)
    county = serializers.CharField(max_length=100, required=False, allow_blank=True)
    city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    street = serializers.CharField(max_length=255, required=False, allow_blank=True)
    postal_code = serializers.CharField(max_length=50, required=False, allow_blank=True)
    full_address = serializers.CharField(required=False, allow_blank=True)

    contact_full_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    contact_role_or_designation = serializers.CharField(max_length=255, required=False, allow_blank=True)
    contact_email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    contact_phone_number = serializers.CharField(max_length=30, required=False, allow_blank=True)
    contact_national_id_number = serializers.CharField(max_length=50, required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs.get("access_type") == Client.AccessType.PORTAL_CLIENT and not attrs.get("email"):
            raise serializers.ValidationError(
                {"email": "Portal clients require an email address."}
            )
        if attrs.get("access_type") == Client.AccessType.PORTAL_CLIENT and not (
            attrs.get("phone_number") or attrs.get("contact_phone_number")
        ):
            raise serializers.ValidationError(
                {"phone_number": "Portal clients require a phone number."}
            )
        return attrs
