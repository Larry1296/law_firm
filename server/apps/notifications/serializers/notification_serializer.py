from rest_framework import serializers

from apps.notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    is_read = serializers.BooleanField(read_only=True)
    case_number = serializers.CharField(source="case.case_number", read_only=True)
    actor_name = serializers.CharField(source="actor.full_name", read_only=True)
    recipient_name = serializers.CharField(source="recipient.full_name", read_only=True)
    recipient_email = serializers.EmailField(source="recipient.email", read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "title",
            "message",
            "action_url",
            "is_read",
            "read_at",
            "created_at",
            "case",
            "case_number",
            "actor_name",
            "recipient_name",
            "recipient_email",
        ]
        read_only_fields = fields
