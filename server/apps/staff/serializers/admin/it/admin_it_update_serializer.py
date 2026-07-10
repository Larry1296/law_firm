from rest_framework import serializers

from apps.common.choices import EmploymentStatus, EmploymentType
from apps.firm.models import Branch, Department
from apps.firm.services.it_department_service import ITDepartmentService
from apps.staff.models import IT, ITPermission


class AdminITUpdateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=False)
    phone_number = serializers.CharField(required=False)
    permission_codes = serializers.MultipleChoiceField(
        choices=ITPermission.choices,
        required=False,
        write_only=True,
    )
    branch = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(),
        required=False,
        allow_null=True,
    )
    department_unit = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = IT
        fields = [
            "email",
            "phone_number",
            "employee_number",
            "department",
            "branch",
            "department_unit",
            "job_title",
            "work_email",
            "work_phone",
            "office_location",
            "reports_to",
            "technical_specialization",
            "certification",
            "can_manage_users",
            "can_manage_system_settings",
            "can_manage_security",
            "can_access_audit_logs",
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

        law_firm = self.instance.law_firm if self.instance else None
        branch = attrs.get("branch", getattr(self.instance, "branch", None))
        department_unit = attrs.get(
            "department_unit",
            getattr(self.instance, "department_unit", None),
        )

        if branch and law_firm and branch.firm_id != law_firm.id:
            raise serializers.ValidationError(
                {"branch": "Branch must belong to the same law firm."}
            )
        if department_unit and law_firm and department_unit.firm_id != law_firm.id:
            raise serializers.ValidationError(
                {"department_unit": "Department must belong to the same law firm."}
            )
        if department_unit and branch and department_unit.branch_id not in [None, branch.id]:
            raise serializers.ValidationError(
                {"department_unit": "Department must belong to the selected branch."}
            )

        it_department = ITDepartmentService.get_it_department(law_firm)
        if it_department is not None:
            if department_unit and department_unit.id != it_department.id:
                raise serializers.ValidationError(
                    {"department_unit": "IT staff must belong to the firm-wide IT department."}
                )
            attrs["department_unit"] = it_department
            attrs["department"] = it_department.name
            attrs["branch"] = None

        return attrs
