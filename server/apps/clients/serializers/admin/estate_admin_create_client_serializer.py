from rest_framework import serializers

from apps.clients.serializers.admin.admin_client_base_create_serializer import (
    AdminClientBaseCreateSerializer,
)


class EstateAdminCreateClientSerializer(AdminClientBaseCreateSerializer):
    estate_name = serializers.CharField(max_length=255)
    deceased_full_name = serializers.CharField(max_length=255)
    deceased_id_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    date_of_death = serializers.DateField(required=False, allow_null=True)
    probate_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    court_reference = serializers.CharField(max_length=100, required=False, allow_blank=True)
    executor_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    executor_contact = serializers.CharField(max_length=30, required=False, allow_blank=True)
    administrator_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    administrator_contact = serializers.CharField(max_length=30, required=False, allow_blank=True)
    estate_value_estimate = serializers.DecimalField(
        max_digits=15,
        decimal_places=2,
        required=False,
        allow_null=True,
    )
    beneficiaries = serializers.CharField(required=False, allow_blank=True)
    assets_description = serializers.CharField(required=False, allow_blank=True)
    liabilities_description = serializers.CharField(required=False, allow_blank=True)
    court_status = serializers.CharField(max_length=100, required=False, allow_blank=True)
