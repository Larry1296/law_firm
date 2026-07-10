from rest_framework import serializers
from apps.firm.models import FirmSetting


class FirmSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = FirmSetting
        fields = [
            "timezone",
            "language",
            "currency",
            "opening_time",
            "closing_time",
            "work_on_saturday",
            "work_on_sunday",
            "email_notifications",
            "sms_notifications",
            "browser_notifications",
            "allow_client_registration",
            "allow_client_document_upload",
            "allow_client_case_tracking",
            "require_password_change",
            "enable_two_factor_authentication",
            "session_timeout_minutes",
            "enable_ai_assistant",
            "enable_ai_case_suggestions",
            "enable_ai_deadline_reminders",
            "is_active",
        ]
        read_only_fields = ["id", "firm"]