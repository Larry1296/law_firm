from rest_framework import serializers

from apps.common.choices import EmploymentStatus, EmploymentType
from apps.firm.models.practice_area import PracticeArea
from apps.staff.models.lawyer import Lawyer, LawyerPermission


class AdminLawyerUpdateSerializer(serializers.ModelSerializer):

    email = serializers.EmailField(required=False)
    phone_number = serializers.CharField(required=False)

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

    class Meta:
        model = Lawyer
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
            "admission_number",
            "practicing_certificate_number",
            "bar_admission_date",
            "practice_area_ids",
            "is_notary",
            "can_commission_oaths",
            "is_court_approved",
            "permission_codes",
            "employment_type",
            "employment_status",
            "date_hired",
            "probation_end_date",
            "date_terminated",
            "termination_reason",
            "professional_summary",
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
        lawyer = self.instance
        reports_to = attrs.get("reports_to")
        practice_areas = attrs.get("practice_area_ids", [])

        if reports_to and lawyer and reports_to.law_firm_id != lawyer.law_firm_id:
            raise serializers.ValidationError(
                {"reports_to": "Reporting lawyer must belong to the same law firm."}
            )

        if reports_to and lawyer and reports_to.id == lawyer.id:
            raise serializers.ValidationError(
                {"reports_to": "A lawyer cannot report to themselves."}
            )

        for practice_area in practice_areas:
            if lawyer and practice_area.firm_id != lawyer.law_firm_id:
                raise serializers.ValidationError(
                    {
                        "practice_area_ids": (
                            "Practice areas must belong to the same law firm."
                        )
                    }
                )

        return attrs
