from rest_framework import serializers

from apps.communications.models import ChatMessage
from apps.communications.serializers.announcement_serializer import serialize_user


class MessageCreateSerializer(serializers.Serializer):
    body = serializers.CharField(allow_blank=False, trim_whitespace=True)


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()
    is_forwarded = serializers.SerializerMethodField()
    forward_direction = serializers.SerializerMethodField()
    forwarded_from = serializers.SerializerMethodField()

    def _viewer_is_client(self):
        request = self.context.get("request")
        viewer = getattr(request, "user", None)
        return bool(viewer and viewer.is_authenticated and hasattr(viewer, "client_profile"))

    def get_sender(self, obj):
        request = self.context.get("request")
        viewer = getattr(request, "user", None)
        if (
            viewer
            and viewer.is_authenticated
            and hasattr(viewer, "client_profile")
            and obj.sender_id != viewer.id
        ):
            firm = obj.thread.firm
            return {
                "id": str(firm.id),
                "full_name": firm.name,
                "email": firm.email,
                "role": "FIRM",
            }
        return serialize_user(obj.sender)

    def get_is_forwarded(self, obj):
        if self._viewer_is_client():
            return False
        return obj.is_forwarded

    def get_forward_direction(self, obj):
        if self._viewer_is_client():
            return ""
        return obj.forward_direction

    def get_forwarded_from(self, obj):
        if self._viewer_is_client() or obj.forwarded_from is None:
            return None
        return {
            "id": str(obj.forwarded_from_id),
            "sender": serialize_user(obj.forwarded_from.sender),
            "created_at": obj.forwarded_from.created_at,
        }

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "thread",
            "sender",
            "body",
            "message_type",
            "is_system_message",
            "is_forwarded",
            "forward_direction",
            "forwarded_from",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
