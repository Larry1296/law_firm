from rest_framework import serializers

from apps.common.choices import FirmRole
from apps.communications.models import ChatThread, ChatThreadParticipant
from apps.communications.serializers.announcement_serializer import serialize_user
from apps.communications.serializers.message_serializer import ChatMessageSerializer


class DirectStaffThreadCreateSerializer(serializers.Serializer):
    staff_user_id = serializers.UUIDField()
    subject = serializers.CharField(max_length=255, required=False, allow_blank=True)
    message = serializers.CharField(required=False, allow_blank=True)


class DirectStaffBulkMessageSerializer(serializers.Serializer):
    staff_user_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
    )
    target_roles = serializers.ListField(
        child=serializers.ChoiceField(choices=FirmRole.staff_roles()),
        required=False,
        allow_empty=True,
    )
    include_all_staff = serializers.BooleanField(required=False, default=False)
    subject = serializers.CharField(max_length=255, required=False, allow_blank=True)
    message = serializers.CharField(allow_blank=False, trim_whitespace=True)

    def validate(self, attrs):
        if not (
            attrs.get("include_all_staff")
            or attrs.get("target_roles")
            or attrs.get("staff_user_ids")
        ):
            raise serializers.ValidationError(
                "Choose at least one staff member, staff role, or all staff."
            )
        return attrs


class ChatThreadParticipantSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()

    def get_user(self, obj):
        return serialize_user(obj.user)

    class Meta:
        model = ChatThreadParticipant
        fields = ["id", "user", "can_reply", "last_read_at", "created_at"]
        read_only_fields = fields


class ChatThreadSerializer(serializers.ModelSerializer):
    participants = serializers.SerializerMethodField()
    case = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    can_reply = serializers.SerializerMethodField()

    def _viewer_is_client(self):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        return bool(user and user.is_authenticated and hasattr(user, "client_profile"))

    def get_participants(self, obj):
        if self._viewer_is_client():
            return []
        return ChatThreadParticipantSerializer(obj.participants.all(), many=True).data

    def get_case(self, obj):
        if obj.case is None:
            return None
        case = obj.case
        client = case.client
        data = {
            "id": str(case.id),
            "case_number": case.case_number,
            "title": case.title,
            "status": case.status,
            "firm": {
                "id": str(case.firm.id),
                "name": case.firm.name,
                "email": case.firm.email,
                "phone_number": case.firm.phone_number,
            },
            "client": {
                "id": str(client.id),
                "full_name": client.full_name,
                "email": client.email,
            },
        }

        if self._viewer_is_client():
            return data

        return {
            **data,
            "assigned_lawyer": (
                {
                    "id": str(case.assigned_lawyer.id),
                    "full_name": case.assigned_lawyer.user.full_name,
                    "email": case.assigned_lawyer.user.email,
                }
                if case.assigned_lawyer_id
                else None
            ),
            "assigned_secretary": (
                {
                    "id": str(case.assigned_secretary.id),
                    "full_name": case.assigned_secretary.user.full_name,
                    "email": case.assigned_secretary.user.email,
                }
                if case.assigned_secretary_id
                else None
            ),
        }

    def get_created_by(self, obj):
        if self._viewer_is_client() and obj.created_by_id != self.context["request"].user.id:
            return {
                "id": str(obj.firm.id),
                "full_name": obj.firm.name,
                "email": obj.firm.email,
                "role": "FIRM",
            }
        return serialize_user(obj.created_by)

    def get_last_message(self, obj):
        last_message = obj.messages.select_related("sender").order_by("-created_at").first()
        return (
            ChatMessageSerializer(last_message, context=self.context).data
            if last_message
            else None
        )

    def get_unread_count(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return 0

        participant = obj.participants.filter(user=user).first()
        if participant is None or participant.last_read_at is None:
            return obj.messages.exclude(sender=user).count()
        return obj.messages.exclude(sender=user).filter(
            created_at__gt=participant.last_read_at,
        ).count()

    def get_can_reply(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        from apps.communications.services import CommunicationAccessService

        return CommunicationAccessService.can_send_message(user, obj)

    class Meta:
        model = ChatThread
        fields = [
            "id",
            "thread_type",
            "thread_key",
            "subject",
            "case",
            "participants",
            "created_by",
            "last_message",
            "unread_count",
            "can_reply",
            "last_message_at",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
