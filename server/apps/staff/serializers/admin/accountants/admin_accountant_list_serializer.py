from rest_framework import serializers

from apps.staff.models import Accountant


class AdminAccountantListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    phone_number = serializers.CharField(source="user.phone_number", read_only=True)
    system_role = serializers.CharField(source="user.role", read_only=True)
    permissions = serializers.SerializerMethodField()
    workload = serializers.SerializerMethodField()

    def get_permissions(self, obj):
        return list(obj.permissions.filter(is_active=True).values_list("code", flat=True))

    def get_workload(self, obj):
        return {
            "level": "NOT_TRACKED",
            "active_cases": 0,
            "closed_cases": 0,
            "total_cases": 0,
            "source": "not_tracked",
        }

    class Meta:
        model = Accountant
        fields = [
            "id",
            "staff_number",
            "employee_number",
            "full_name",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "system_role",
            "firm_role",
            "department",
            "job_title",
            "work_email",
            "work_phone",
            "office_location",
            "accounting_specialization",
            "employment_type",
            "employment_status",
            "date_hired",
            "is_active",
            "permissions",
            "workload",
        ]
        read_only_fields = fields
