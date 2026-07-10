from rest_framework import serializers

from apps.common.choices import EmploymentType
from apps.firm.models import Branch, Department
from apps.firm.models.practice_area import PracticeArea
from apps.staff.models.lawyer import Lawyer, LawyerPermission
from apps.users.models import User


class AdminLawyerCreateSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    phone_number = serializers.CharField(max_length=20)
    national_id_number = serializers.CharField(max_length=20)
    staff_number = serializers.CharField(
        max_length=30,
        required=False,
        allow_blank=True,
    )

    practice_area_ids = serializers.PrimaryKeyRelatedField(
        queryset=PracticeArea.objects.all(),
        many=True,
        required=False,
        write_only=True,
    )
    permission_codes = serializers.MultipleChoiceField(
        choices=LawyerPermission.choices,
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
        model = Lawyer
        fields = [
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "national_id_number",
            "staff_number",
            "employee_number",
            "department",
            "branch",
            "department_unit",
            "job_title",
            "work_email",
            "work_phone",
            "office_location",
            "reports_to",
            "admission_number",
            "practicing_certificate_number",
            "bar_admission_date",
            "practice_area_ids",
            "is_notary",
            "can_commission_oaths",
            "is_court_approved",
            "permission_codes",
            "employment_type",
            "date_hired",
            "probation_end_date",
            "professional_summary",
        ]

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "A user with this email already exists."
            )
        return value

    def validate_phone_number(self, value):
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError(
                "A user with this phone number already exists."
            )
        return value

    def validate_national_id_number(self, value):
        if User.objects.filter(national_id_number=value).exists():
            raise serializers.ValidationError(
                "A user with this national ID number already exists."
            )
        return value

    def validate_employment_type(self, value):
        if value not in EmploymentType.values:
            raise serializers.ValidationError("Invalid employment type.")
        return value

    def validate(self, attrs):
        law_firm = self.context.get("law_firm")
        reports_to = attrs.get("reports_to")
        practice_areas = attrs.get("practice_area_ids", [])
        branch = attrs.get("branch")
        department_unit = attrs.get("department_unit")

        if reports_to and law_firm and reports_to.law_firm_id != law_firm.id:
            raise serializers.ValidationError(
                {"reports_to": "Reporting lawyer must belong to the same law firm."}
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

        for practice_area in practice_areas:
            if law_firm and practice_area.firm_id != law_firm.id:
                raise serializers.ValidationError(
                    {
                        "practice_area_ids": (
                            "Practice areas must belong to the same law firm."
                        )
                    }
                )

        return attrs
