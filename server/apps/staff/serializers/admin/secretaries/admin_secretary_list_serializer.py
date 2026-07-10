from rest_framework import serializers

from apps.staff.models import Secretary


class AdminSecretaryListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    phone_number = serializers.CharField(source="user.phone_number", read_only=True)
    system_role = serializers.CharField(source="user.role", read_only=True)
    permissions = serializers.SerializerMethodField()
    workload = serializers.SerializerMethodField()

    def get_permissions(self, obj):
        return list(
            obj.permissions.filter(is_active=True).values_list("code", flat=True)
        )

    def get_workload(self, obj):
        active_cases = obj.assigned_cases.filter(is_active=True).count()
        closed_cases = obj.assigned_cases.filter(status="CLOSED").count()
        total_cases = obj.assigned_cases.count()

        if active_cases <= 8:
            level = "LOW"
        elif active_cases <= 20:
            level = "MEDIUM"
        else:
            level = "HIGH"

        return {
            "level": level,
            "active_cases": active_cases,
            "closed_cases": closed_cases,
            "total_cases": total_cases,
            "source": "assigned_cases",
        }

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
            "system_role",
            "firm_role",
            "department",
            "job_title",
            "work_email",
            "work_phone",
            "office_location",
            "employment_type",
            "employment_status",
            "date_hired",
            "is_active",
            "permissions",
            "workload",
        ]
        read_only_fields = fields
