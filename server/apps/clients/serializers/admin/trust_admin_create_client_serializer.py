from rest_framework import serializers

from apps.clients.serializers.admin.admin_client_base_create_serializer import (
    AdminClientBaseCreateSerializer,
)


class TrustAdminCreateClientSerializer(AdminClientBaseCreateSerializer):
    trust_name = serializers.CharField(max_length=255)
    trust_type = serializers.CharField(max_length=100, required=False, allow_blank=True)
    trust_deed_reference = serializers.CharField(max_length=100, required=False, allow_blank=True)
    formation_date = serializers.DateField(required=False, allow_null=True)
    jurisdiction = serializers.CharField(max_length=100, required=False, allow_blank=True)
    trustee_count = serializers.IntegerField(required=False, min_value=0, default=0)
    primary_trustee_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    primary_trustee_contact = serializers.CharField(max_length=30, required=False, allow_blank=True)
    beneficiary_details = serializers.CharField(required=False, allow_blank=True)
    assets_under_trust = serializers.CharField(required=False, allow_blank=True)
    legal_representative = serializers.CharField(max_length=255, required=False, allow_blank=True)
