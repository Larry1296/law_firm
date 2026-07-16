from rest_framework import serializers


class StaffWorkspaceDashboardSerializer(serializers.Serializer):
    profile = serializers.DictField()
    summary = serializers.DictField()
    permissions = serializers.ListField(child=serializers.CharField())
    default_work = serializers.DictField()
    system_health = serializers.DictField(required=False)
    recent_notifications = serializers.ListField(child=serializers.DictField())
    recent_activity = serializers.ListField(child=serializers.DictField())


class StaffWorkspaceProfileSerializer(serializers.Serializer):
    def to_representation(self, instance):
        user = instance.user
        permissions = list(
            instance.permissions.filter(is_active=True).values_list("code", flat=True)
        )
        return {
            "id": str(instance.id),
            "staff_number": instance.staff_number,
            "employee_number": instance.employee_number,
            "full_name": user.full_name,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone_number": user.phone_number,
            "law_firm_name": instance.law_firm.name,
            "firm_role": instance.firm_role,
            "department": instance.department,
            "job_title": instance.job_title,
            "work_email": instance.work_email,
            "work_phone": instance.work_phone,
            "office_location": instance.office_location,
            "employment_type": instance.employment_type,
            "employment_status": instance.employment_status,
            "date_hired": instance.date_hired,
            "is_active": instance.is_active,
            "permissions": permissions,
            "notes": getattr(instance, "notes", None),
        }


class StaffWorkspaceChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )
        return attrs


class StaffWorkspaceItemSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    message = serializers.CharField(read_only=True, required=False)
    is_read = serializers.BooleanField(read_only=True, required=False)
    created_at = serializers.DateTimeField(read_only=True, required=False)
    action_url = serializers.CharField(read_only=True, required=False)
    notification_type = serializers.CharField(read_only=True, required=False)
