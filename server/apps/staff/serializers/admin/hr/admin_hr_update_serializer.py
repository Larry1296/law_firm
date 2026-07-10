from rest_framework import serializers

from apps.common.choices import EmploymentStatus, EmploymentType
from apps.staff.models import HR, HRPermission


class AdminHRUpdateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=False)
    phone_number = serializers.CharField(required=False)
    permission_codes = serializers.MultipleChoiceField(
        choices=HRPermission.choices,
        required=False,
        write_only=True,
    )

    class Meta:
        model = HR
        fields = [
            "email",
            "phone_number",
            "employee_number",
            "department",
            "job_title",
            "work_email",
            "work_phone",
            "office_location",
            "reports_to",
            "hr_specialization",
            "can_manage_staff_records",
            "can_manage_recruitment",
            "can_manage_leave",
            "can_manage_payroll_records",
            "permission_codes",
            "employment_type",
            "employment_status",
            "date_hired",
            "probation_end_date",
            "date_terminated",
            "termination_reason",
            "notes",
            "is_active",
        ]

    def validate_employment_type(self, value):
        if value not in EmploymentType.values:
            raise serializers.ValidationError("Invalid employment type.")
        return value

    def validate_employment_status(self, value):
        if value not in EmploymentStatus.values:
            raise serializers.ValidationError("Invalid employment status.")
        return value

    def validate(self, attrs):
        reports_to = attrs.get("reports_to")
        if reports_to and self.instance and reports_to.law_firm_id != self.instance.law_firm_id:
            raise serializers.ValidationError(
                {"reports_to": "Reporting HR staff must belong to the same law firm."}
            )
        return attrs
