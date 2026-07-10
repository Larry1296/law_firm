from rest_framework import serializers

from apps.clients.serializers.admin.admin_client_base_create_serializer import (
    AdminClientBaseCreateSerializer,
)


class GovernmentAdminCreateClientSerializer(AdminClientBaseCreateSerializer):
    government_entity_name = serializers.CharField(max_length=255)
    department = serializers.CharField(max_length=255, required=False, allow_blank=True)
    agency_code = serializers.CharField(max_length=100, required=False, allow_blank=True)
    registration_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    jurisdiction_level = serializers.CharField(max_length=100, required=False, allow_blank=True)
    contact_person_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    contact_person_position = serializers.CharField(max_length=255, required=False, allow_blank=True)
    contact_person_phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    contact_person_email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    office_address = serializers.CharField(required=False, allow_blank=True)
    mandate_area = serializers.CharField(required=False, allow_blank=True)
    legal_department_head = serializers.CharField(max_length=255, required=False, allow_blank=True)
    legal_department_contact = serializers.CharField(max_length=30, required=False, allow_blank=True)
