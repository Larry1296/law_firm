from rest_framework import serializers

from apps.communications.models import ChatMessage
from apps.communications.serializers.announcement_serializer import serialize_user


class MessageCreateSerializer(serializers.Serializer):
    body = serializers.CharField(allow_blank=False, trim_whitespace=True)


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()

    def get_sender(self, obj):
        return serialize_user(obj.sender)

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "thread",
            "sender",
            "body",
            "message_type",
            "is_system_message",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields