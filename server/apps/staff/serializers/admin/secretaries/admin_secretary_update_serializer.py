from rest_framework import serializers

from apps.common.choices import EmploymentStatus, EmploymentType
from apps.staff.models import Lawyer, Secretary, SecretaryPermission


class AdminSecretaryUpdateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=False)
    phone_number = serializers.CharField(required=False)
    assigned_lawyer_ids = serializers.PrimaryKeyRelatedField(
        queryset=Lawyer.objects.all(),
        many=True,
        required=False,
        write_only=True,
    )
    permission_codes = serializers.MultipleChoiceField(
        choices=SecretaryPermission.choices,
        required=False,
        write_only=True,
    )

    class Meta:
        model = Secretary
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
            "assigned_lawyer_ids",
            "can_prepare_documents",
            "can_schedule_appointments",
            "can_manage_client_intake",
            "can_receive_documents",
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
        secretary = self.instance
        reports_to = attrs.get("reports_to")
        assigned_lawyers = attrs.get("assigned_lawyer_ids", [])

        if reports_to and secretary and reports_to.law_firm_id != secretary.law_firm_id:
            raise serializers.ValidationError(
                {"reports_to": "Reporting lawyer must belong to the same law firm."}
            )

        for lawyer in assigned_lawyers:
            if secretary and lawyer.law_firm_id != secretary.law_firm_id:
                raise serializers.ValidationError(
                    {
                        "assigned_lawyer_ids": (
                            "Assigned lawyers must belong to the same law firm."
                        )
                    }
                )

        return attrs
