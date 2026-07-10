from rest_framework import serializers

from apps.common.choices import EmploymentType
from apps.firm.models.practice_area import PracticeArea
from apps.staff.models.lawyer import Lawyer


class OwnerLawyerProfileSerializer(serializers.ModelSerializer):
    staff_number = serializers.CharField(max_length=30, required=False, allow_blank=True)
    practice_area_ids = serializers.PrimaryKeyRelatedField(
        queryset=PracticeArea.objects.all(),
        many=True,
        required=False,
        write_only=True,
    )

    class Meta:
        model = Lawyer
        fields = [
            "staff_number",
            "employee_number",
            "department",
            "job_title",
            "work_email",
            "work_phone",
            "office_location",
            "admission_number",
            "practicing_certificate_number",
            "bar_admission_date",
            "practice_area_ids",
            "is_notary",
            "can_commission_oaths",
            "is_court_approved",
            "employment_type",
            "date_hired",
            "probation_end_date",
            "professional_summary",
        ]

    def validate_employment_type(self, value):
        if value not in EmploymentType.values:
            raise serializers.ValidationError("Invalid employment type.")
        return value

    def validate(self, attrs):
        firm = self.context.get("firm")
        practice_areas = attrs.get("practice_area_ids", [])

        if firm is None:
            raise serializers.ValidationError("Firm context is required.")

        for practice_area in practice_areas:
            if practice_area.firm_id != firm.id:
                raise serializers.ValidationError(
                    {
                        "practice_area_ids": (
                            "Practice areas must belong to the same law firm."
                        )
                    }
                )

        return attrs
