from rest_framework import serializers

from apps.staff.models import Secretary


class SecretaryProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    phone_number = serializers.CharField(source="user.phone_number", read_only=True)
    law_firm_name = serializers.CharField(source="law_firm.name", read_only=True)
    assigned_lawyers = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    def get_assigned_lawyers(self, obj):
        return [
            {"id": str(lawyer.id), "full_name": lawyer.user.full_name}
            for lawyer in obj.assigned_lawyers.select_related("user")
        ]

    def get_permissions(self, obj):
        return list(
            obj.permissions.filter(is_active=True).values_list("code", flat=True)
        )

    class Meta:
        model = Secretary
        fields = [
            "id",
            "staff_number",
            "employee_number",
            "full_name",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "law_firm_name",
            "firm_role",
            "department",
            "job_title",
            "work_email",
            "work_phone",
            "office_location",
            "assigned_lawyers",
            "can_prepare_documents",
            "can_schedule_appointments",
            "can_manage_client_intake",
            "can_receive_documents",
            "employment_type",
            "employment_status",
            "date_hired",
            "is_active",
            "permissions",
        ]
        read_only_fields = fields
