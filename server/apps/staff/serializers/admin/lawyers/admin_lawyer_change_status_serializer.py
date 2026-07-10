from rest_framework import serializers

from apps.common.choices import EmploymentStatus


class AdminLawyerChangeStatusSerializer(serializers.Serializer):
    employment_status = serializers.ChoiceField(
        choices=EmploymentStatus.choices,
    )

    termination_reason = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    def validate(self, attrs):
        status = attrs["employment_status"]
        reason = attrs.get("termination_reason")

        if status == EmploymentStatus.TERMINATED and not reason:
            raise serializers.ValidationError(
                {
                    "termination_reason": (
                        "Termination reason is required when terminating a lawyer."
                    )
                }
            )

        return attrs