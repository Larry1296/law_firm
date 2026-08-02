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
from apps.courtroom.services import CourtroomService


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


class SafeSessionMixin(serializers.ModelSerializer):
    event_summary = serializers.SerializerMethodField()
    provider_type = serializers.CharField(source="provider_detected", read_only=True)

    def get_event_summary(self, obj):
        event, matter = obj.event, obj.event.case
        return {
            "id": str(event.id), "case_id": str(matter.id),
            "internal_matter_number": matter.case_number,
            "official_court_case_number": getattr(matter, "official_court_case_number", ""),
            "matter_title": matter.title,
            "client": getattr(matter.client, "full_name", ""),
            "court": event.court, "court_station": event.court_station,
            "courtroom": event.courtroom, "judicial_officer": event.judicial_officer,
            "appearance_type": event.get_event_type_display(), "hearing_mode": event.hearing_mode,
            "starts_at": event.starts_at, "ends_at": event.ends_at,
            "cause_list_position": event.cause_list_position,
        }


class AdminCourtroomSessionSerializer(SafeSessionMixin, serializers.ModelSerializer):
    event_id = serializers.PrimaryKeyRelatedField(source="event", queryset=CaseEvent.objects.all(), write_only=True)
    class Meta:
        model = CourtroomSession
        fields = ["id", "event_id", "event_summary", "provider", "provider_type", "join_url", "responsible_advocate", "backup_advocate", "link_source", "link_source_reference", "link_verified", "link_verified_at", "client_attendance_requirement", "client_access_enabled", "client_access_from", "client_access_until", "join_window_minutes_before", "join_window_minutes_after", "status", "matter_called_at", "matter_completed_at", "notes", "created_at", "updated_at"]
        read_only_fields = ["id", "provider_type", "status", "link_verified_at", "matter_called_at", "matter_completed_at", "created_at", "updated_at"]

    def validate(self, attrs):
        event = attrs.get("event") or getattr(self.instance, "event", None)
        provider = attrs.get("provider") or getattr(self.instance, "provider", None)
        url = attrs.get("join_url") or getattr(self.instance, "join_url", "")
        attrs["provider_detected"] = CourtroomService.detect_provider(url, provider)
        if event and provider and provider.firm_id != event.case.firm_id:
            raise serializers.ValidationError("Provider and event must belong to the same firm.")
        advocate = attrs.get("responsible_advocate")
        backup = attrs.get("backup_advocate")
        for person in (advocate, backup):
            if person and event and person.law_firm_id != event.case.firm_id:
                raise serializers.ValidationError("Advocates must belong to the event's firm.")
        access_from = attrs.get("client_access_from", getattr(self.instance, "client_access_from", None))
        access_until = attrs.get("client_access_until", getattr(self.instance, "client_access_until", None))
        if access_from and access_until and access_until <= access_from:
            raise serializers.ValidationError("Client access must end after it begins.")
        if attrs.get("client_access_enabled", getattr(self.instance, "client_access_enabled", False)) and not (access_from and access_until):
            raise serializers.ValidationError("An enabled client access window requires both start and end times.")
        return attrs


class AdvocateCourtroomSessionSerializer(SafeSessionMixin, serializers.ModelSerializer):
    class Meta:
        model = CourtroomSession
        fields = ["id", "event_summary", "provider_type", "link_verified", "client_attendance_requirement", "status", "matter_called_at", "matter_completed_at", "created_at", "updated_at"]


class ClientCourtroomSessionSummarySerializer(SafeSessionMixin, serializers.ModelSerializer):
    class Meta:
        model = CourtroomSession
        fields = ["id", "event_summary", "provider_type", "client_attendance_requirement", "status"]


class CourtroomLaunchResponseSerializer(serializers.Serializer):
    launch_token = serializers.UUIDField(source="id")
    expires_at = serializers.DateTimeField()


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

    def validate(self, attrs):
        session = self.context.get("session")
        permission = getattr(session, "recording_permission", None) if session else None
        if not permission or permission.permission_status != permission.Status.GRANTED:
            raise serializers.ValidationError("Court recording is prohibited unless leave has been recorded as granted.")
        if not (permission.audio_allowed or permission.video_allowed):
            raise serializers.ValidationError("The granted permission does not allow audio or video recording.")
        return attrs
