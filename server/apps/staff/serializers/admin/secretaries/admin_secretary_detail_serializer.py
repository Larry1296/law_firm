from datetime import date

from rest_framework import serializers

from apps.staff.models import Secretary


class AdminSecretaryDetailSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    phone_number = serializers.CharField(source="user.phone_number", read_only=True)
    national_id_number = serializers.CharField(
        source="user.national_id_number",
        read_only=True,
    )
    law_firm_name = serializers.CharField(source="law_firm.name", read_only=True)
    reports_to_name = serializers.CharField(
        source="reports_to.user.full_name",
        read_only=True,
    )
    assigned_lawyers = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    available_permissions = serializers.SerializerMethodField()
    analytics = serializers.SerializerMethodField()

    def get_assigned_lawyers(self, obj):
        return [
            {
                "id": str(lawyer.id),
                "full_name": lawyer.user.full_name,
                "email": lawyer.user.email,
            }
            for lawyer in obj.assigned_lawyers.select_related("user")
        ]

    def get_permissions(self, obj):
        return list(
            obj.permissions.filter(is_active=True).values_list("code", flat=True)
        )

    def get_available_permissions(self, obj):
        return [
            {"code": code, "label": label}
            for code, label in obj.permissions.model._meta.get_field("code").choices
        ]

    def get_analytics(self, obj):
        tenure_days = None
        if obj.date_hired:
            tenure_days = (date.today() - obj.date_hired).days

        return {
            "tenure_days": tenure_days,
            "assigned_lawyers": obj.assigned_lawyers.count(),
            "active_permissions": obj.permissions.filter(is_active=True).count(),
            "default_work": {
                "can_prepare_documents": obj.can_prepare_documents,
                "can_schedule_appointments": obj.can_schedule_appointments,
                "can_manage_client_intake": obj.can_manage_client_intake,
                "can_receive_documents": obj.can_receive_documents,
            },
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
            "assigned_lawyers",
            "can_prepare_documents",
            "can_schedule_appointments",
            "can_manage_client_intake",
            "can_receive_documents",
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
