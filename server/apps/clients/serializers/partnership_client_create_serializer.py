from rest_framework import serializers

from apps.clients.models import Client


class PartnershipClientCreateSerializer(serializers.Serializer):

    # --------------------------------
    # Core Client Information
    # --------------------------------

    full_name = serializers.CharField(
        required=False,
        allow_blank=True
    )

    email = serializers.EmailField(
        required=False,
        allow_blank=True
    )

    phone_number = serializers.CharField(
        required=False,
        allow_blank=True
    )

    access_type = serializers.ChoiceField(
        choices=Client.AccessType.choices
    )

    portal_enabled = serializers.BooleanField(
        default=False
    )

    # --------------------------------
    # Partnership Information
    # --------------------------------

    partnership_name = serializers.CharField()

    registration_number = serializers.CharField(
        required=False,
        allow_blank=True
    )

    tax_pin = serializers.CharField(
        required=False,
        allow_blank=True
    )

    formation_date = serializers.DateField(
        required=False,
        allow_null=True
    )

    partner_count = serializers.IntegerField(
        required=False,
        default=0
    )

    agreement_type = serializers.CharField(
        required=False,
        allow_blank=True
    )

    # --------------------------------
    # Primary Contact
    # --------------------------------

    primary_contact_name = serializers.CharField(
        required=False,
        allow_blank=True
    )

    primary_contact_email = serializers.EmailField(
        required=False,
        allow_blank=True
    )

    primary_contact_phone = serializers.CharField(
        required=False,
        allow_blank=True
    )

    # --------------------------------
    # Address
    # --------------------------------

    country = serializers.CharField()

    county = serializers.CharField(
        required=False,
        allow_blank=True
    )

    city = serializers.CharField(
        required=False,
        allow_blank=True
    )

    street = serializers.CharField(
        required=False,
        allow_blank=True
    )

    postal_code = serializers.CharField(
        required=False,
        allow_blank=True
    )

    full_address = serializers.CharField()