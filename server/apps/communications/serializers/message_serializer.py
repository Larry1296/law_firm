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
    has_been_forwarded = serializers.SerializerMethodField()
    forwarded_at = serializers.SerializerMethodField()
    delivery_status = serializers.SerializerMethodField()
    read_at = serializers.SerializerMethodField()

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

    def _forwarded_copy(self, obj):
        if not hasattr(obj, "_cached_forwarded_copy"):
            obj._cached_forwarded_copy = (
                obj.forwarded_messages.order_by("created_at").first()
            )
        return obj._cached_forwarded_copy

    def get_has_been_forwarded(self, obj):
        if self._viewer_is_client():
            return False
        return self._forwarded_copy(obj) is not None

    def get_forwarded_at(self, obj):
        if self._viewer_is_client():
            return None
        forwarded_copy = self._forwarded_copy(obj)
        return forwarded_copy.created_at if forwarded_copy else None

    def _recipient_participants(self, obj):
        if not hasattr(obj, "_cached_recipient_participants"):
            queryset = obj.thread.participants.exclude(user_id=obj.sender_id)
            obj._cached_recipient_participants = list(queryset)
        return obj._cached_recipient_participants

    def _read_participants(self, obj):
        if not hasattr(obj, "_cached_read_participants"):
            obj._cached_read_participants = [
                participant
                for participant in self._recipient_participants(obj)
                if participant.last_read_at
                and participant.last_read_at >= obj.created_at
            ]
        return obj._cached_read_participants

    def get_delivery_status(self, obj):
        recipients = self._recipient_participants(obj)
        if not recipients:
            return "sent"

        read_participants = self._read_participants(obj)
        if len(read_participants) == len(recipients):
            return "read"

        return "delivered"

    def get_read_at(self, obj):
        read_participants = self._read_participants(obj)
        if not read_participants:
            return None
        return max(participant.last_read_at for participant in read_participants)

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
            "has_been_forwarded",
            "forwarded_at",
            "delivery_status",
            "read_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
