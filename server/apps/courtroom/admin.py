from django.contrib import admin

from apps.courtroom.models import (
    CourtroomAttendanceLog,
    CourtroomCauseListSync,
    CourtroomProvider,
    CourtroomRecording,
    CourtroomSession,
)


@admin.register(CourtroomProvider)
class CourtroomProviderAdmin(admin.ModelAdmin):
    list_display = ("name", "firm", "provider_type", "is_default", "is_active")
    list_filter = ("provider_type", "is_default", "is_active")
    search_fields = ("name", "firm__name")


@admin.register(CourtroomSession)
class CourtroomSessionAdmin(admin.ModelAdmin):
    list_display = ("event", "provider", "status", "live_started_at", "live_ended_at")
    list_filter = ("status", "provider")
    search_fields = ("event__title", "event__case__case_number", "provider_meeting_id")


@admin.register(CourtroomAttendanceLog)
class CourtroomAttendanceLogAdmin(admin.ModelAdmin):
    list_display = ("attendee_name", "attendee_role", "status", "session", "joined_at", "left_at")
    list_filter = ("attendee_role", "status")
    search_fields = ("attendee_name", "attendee_email", "session__event__title")


@admin.register(CourtroomCauseListSync)
class CourtroomCauseListSyncAdmin(admin.ModelAdmin):
    list_display = ("firm", "court_station", "cause_list_date", "status", "matched_events", "created_events")
    list_filter = ("status", "cause_list_date")
    search_fields = ("firm__name", "court_station", "source_name")


@admin.register(CourtroomRecording)
class CourtroomRecordingAdmin(admin.ModelAdmin):
    list_display = ("title", "session", "status", "recorded_at", "is_downloadable")
    list_filter = ("status", "is_downloadable")
    search_fields = ("title", "session__event__title", "session__event__case__case_number")
