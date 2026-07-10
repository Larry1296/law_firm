from rest_framework import serializers

from apps.communications.choices import AnnouncementAudience
from apps.communications.models import Announcement, AnnouncementRecipient


def serialize_user(user):
    if user is None:
        return None
    return {
        "id": str(user.id),
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
    }


class AnnouncementCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    body = serializers.CharField()
    audience_type = serializers.ChoiceField(
        choices=AnnouncementAudience.choices,
        default=AnnouncementAudience.ALL_STAFF,
    )
    target_user_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
        write_only=True,
    )


class AnnouncementRecipientSerializer(serializers.ModelSerializer):
    recipient_user = serializers.SerializerMethodField()

    def get_recipient_user(self, obj):
        return serialize_user(obj.recipient_user)

    class Meta:
        model = AnnouncementRecipient
        fields = ["id", "recipient_user", "read_at", "created_at"]
        read_only_fields = fields


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()
    recipient_count = serializers.SerializerMethodField()
    read_count = serializers.SerializerMethodField()
    recipients = AnnouncementRecipientSerializer(many=True, read_only=True)

    def get_created_by(self, obj):
        return serialize_user(obj.created_by)

    def get_recipient_count(self, obj):
        return obj.recipients.count()

    def get_read_count(self, obj):
        return obj.recipients.filter(read_at__isnull=False).count()

    class Meta:
        model = Announcement
        fields = [
            "id",
            "title",
            "body",
            "audience_type",
            "is_active",
            "created_by",
            "recipient_count",
            "read_count",
            "recipients",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class AnnouncementInboxSerializer(serializers.ModelSerializer):
    announcement = AnnouncementSerializer(read_only=True)
    is_read = serializers.SerializerMethodField()

    def get_is_read(self, obj):
        return obj.read_at is not None

    class Meta:
        model = AnnouncementRecipient
        fields = ["id", "announcement", "is_read", "read_at", "created_at"]
        read_only_fields = fields