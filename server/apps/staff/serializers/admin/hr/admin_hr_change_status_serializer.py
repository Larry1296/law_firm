from rest_framework import serializers

from apps.common.choices import EmploymentStatus


class AdminHRChangeStatusSerializer(serializers.Serializer):
    employment_status = serializers.ChoiceField(choices=EmploymentStatus.choices)
    termination_reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if (
            attrs["employment_status"] == EmploymentStatus.TERMINATED
            and not attrs.get("termination_reason")
        ):
            raise serializers.ValidationError(
                {"termination_reason": "Termination reason is required when terminating HR staff."}
            )
        return attrs
