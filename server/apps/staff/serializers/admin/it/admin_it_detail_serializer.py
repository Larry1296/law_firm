from datetime import date

from rest_framework import serializers

from apps.firm.services.it_department_service import ITDepartmentService
from apps.staff.models import IT, ITPermission


class AdminITDetailSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    phone_number = serializers.CharField(source="user.phone_number", read_only=True)
    national_id_number = serializers.CharField(source="user.national_id_number", read_only=True)
    law_firm_name = serializers.CharField(source="law_firm.name", read_only=True)
    reports_to_name = serializers.CharField(source="reports_to.user.full_name", read_only=True)
    permissions = serializers.SerializerMethodField()
    available_permissions = serializers.SerializerMethodField()
    analytics = serializers.SerializerMethodField()

    def get_permissions(self, obj):
        return list(obj.permissions.filter(is_active=True).values_list("code", flat=True))

    def get_available_permissions(self, obj):
        return [{"code": code, "label": label} for code, label in ITPermission.choices]

    def get_analytics(self, obj):
        tenure_days = (date.today() - obj.date_hired).days if obj.date_hired else None
        it_department = ITDepartmentService.get_it_department(obj.law_firm)
        return {
            "tenure_days": tenure_days,
            "active_permissions": obj.permissions.filter(is_active=True).count(),
            "it_management": {
                "source": "it_department" if it_department else "admin_fallback",
                "department_id": str(it_department.id) if it_department else None,
                "department_name": it_department.name if it_department else None,
                "message": (
                    "IT matters are handled by the IT department."
                    if it_department
                    else "No IT department exists, so admin handles IT matters."
                ),
            },
            "default_work": {
                "can_manage_users": obj.can_manage_users,
                "can_manage_system_settings": obj.can_manage_system_settings,
                "can_manage_security": obj.can_manage_security,
                "can_access_audit_logs": obj.can_access_audit_logs,
            },
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
            "national_id_number",
            "law_firm",
            "law_firm_name",
            "firm_role",
            "department",
            "job_title",
            "work_email",
            "work_phone",
            "office_location",
            "reports_to",
            "reports_to_name",
            "technical_specialization",
            "certification",
            "can_manage_users",
            "can_manage_system_settings",
            "can_manage_security",
            "can_access_audit_logs",
            "employment_type",
            "employment_status",
            "date_hired",
            "probation_end_date",
            "date_terminated",
            "termination_reason",
            "notes",
            "is_active",
            "permissions",
            "available_permissions",
            "analytics",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
