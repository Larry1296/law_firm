from rest_framework import serializers

from apps.firm.services.it_department_service import ITDepartmentService
from apps.staff.models import IT


class AdminITListSerializer(serializers.ModelSerializer):
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
        it_department = ITDepartmentService.get_it_department(obj.law_firm)
        active_it_staff = obj.law_firm.it_staff.filter(is_active=True).count()
        active_permissions = obj.permissions.filter(is_active=True).count()

        if it_department is None:
            return {
                "level": "ADMIN_FALLBACK",
                "active_cases": active_permissions,
                "closed_cases": 0,
                "total_cases": active_permissions,
                "source": "admin_fallback",
                "label": "Admin fallback",
                "description": "No IT department exists, so admin handles IT matters.",
            }

        return {
            "level": "DEPARTMENT_MANAGED",
            "active_cases": active_permissions,
            "closed_cases": 0,
            "total_cases": active_permissions,
            "source": "it_department",
            "label": "IT Department",
            "description": f"{active_it_staff} active IT staff manage IT matters.",
        }

    class Meta:
        model = IT
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
            "technical_specialization",
            "employment_type",
            "employment_status",
            "date_hired",
            "is_active",
            "permissions",
            "workload",
        ]
        read_only_fields = fields
