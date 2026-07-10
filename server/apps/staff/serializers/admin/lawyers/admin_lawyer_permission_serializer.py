from rest_framework import serializers

from apps.staff.models.lawyer import LawyerPermission


class AdminLawyerPermissionSerializer(serializers.Serializer):
    permission_codes = serializers.MultipleChoiceField(
        choices=LawyerPermission.choices,
        allow_empty=True,
    )
