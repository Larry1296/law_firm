from rest_framework import serializers

from apps.cases.models import CaseEvent
from apps.courtroom.models import (
    CourtroomAttendanceLog,
    CourtroomCauseListSync,
    CourtroomProvider,
    CourtroomRecording,
    CourtroomSession,
)
from apps.events.serializers import EventSerializer


class CourtroomProviderSerializer(serializers.ModelSerializer):
    provider_type_label = serializers.CharField(source="get_provider_type_display", read_only=True)

    class Meta:
        model = CourtroomProvider
        fields = [
            "id",
            "name",
            "provider_type",
            "provider_type_label",
            "base_url",
            "is_default",
            "is_active",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class CourtroomSessionSerializer(serializers.ModelSerializer):
    event = EventSerializer(read_only=True)
    event_id = serializers.PrimaryKeyRelatedField(
        source="event",
        queryset=CaseEvent.objects.all(),
        write_only=True,
    )
    provider_name = serializers.CharField(source="provider.name", read_only=True)
    attendance_count = serializers.IntegerField(read_only=True)
    recording_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = CourtroomSession
        fields = [
            "id",
            "event",
            "event_id",
            "provider",
            "provider_name",
            "status",
            "join_url",
            "host_url",
            "provider_meeting_id",
            "passcode",
            "live_started_at",
            "live_ended_at",
            "allow_recording_downloads",
            "last_provider_sync_at",
            "provider_payload",
            "notes",
            "attendance_count",
            "recording_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "event",
            "provider_name",
            "attendance_count",
            "recording_count",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        event = attrs.get("event") or getattr(self.instance, "event", None)
        join_url = attrs.get("join_url") or getattr(self.instance, "join_url", "")
        if not join_url:
            raise serializers.ValidationError("A courtroom session requires a join URL.")
        if event and event.is_virtual_courtroom_enabled and event.virtual_courtroom_url and join_url != event.virtual_courtroom_url:
            attrs.setdefault("provider_payload", {})
        return attrs


class CourtroomAttendanceLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = CourtroomAttendanceLog
        fields = [
            "id",
            "session",
            "user",
            "user_name",
            "attendee_name",
            "attendee_email",
            "attendee_role",
            "status",
            "joined_at",
            "left_at",
            "duration_seconds",
            "ip_address",
            "user_agent",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "session", "user_name", "created_at", "updated_at"]


class CourtroomCauseListSyncSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source="provider.name", read_only=True)

    class Meta:
        model = CourtroomCauseListSync
        fields = [
            "id",
            "provider",
            "provider_name",
            "source_name",
            "source_url",
            "court_station",
            "cause_list_date",
            "status",
            "started_at",
            "completed_at",
            "total_items",
            "matched_events",
            "created_events",
            "error_message",
            "raw_payload",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "provider_name", "created_at", "updated_at"]


class CourtroomRecordingSerializer(serializers.ModelSerializer):
    download_available = serializers.SerializerMethodField()

    def get_download_available(self, obj):
        return obj.is_downloadable and obj.status == CourtroomRecording.RecordingStatus.READY and (
            bool(obj.file) or bool(obj.download_url) or bool(obj.recording_url)
        )

    class Meta:
        model = CourtroomRecording
        fields = [
            "id",
            "session",
            "title",
            "status",
            "recording_url",
            "download_url",
            "file",
            "recorded_at",
            "duration_seconds",
            "file_size_bytes",
            "is_downloadable",
            "download_available",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "session", "download_available", "created_at", "updated_at"]
