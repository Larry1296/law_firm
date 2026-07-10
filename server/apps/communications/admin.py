from django.contrib import admin

from apps.communications.models import (
    Announcement,
    AnnouncementRecipient,
    ChatMessage,
    ChatThread,
    ChatThreadParticipant,
)


class AnnouncementRecipientInline(admin.TabularInline):
    model = AnnouncementRecipient
    extra = 0
    readonly_fields = ["created_at", "updated_at"]


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ["title", "firm", "audience_type", "created_by", "is_active", "created_at"]
    list_filter = ["audience_type", "is_active", "firm"]
    search_fields = ["title", "body", "created_by__email"]
    inlines = [AnnouncementRecipientInline]


@admin.register(ChatThread)
class ChatThreadAdmin(admin.ModelAdmin):
    list_display = ["subject", "thread_type", "firm", "case", "is_active", "last_message_at"]
    list_filter = ["thread_type", "is_active", "firm"]
    search_fields = ["subject", "thread_key", "case__case_number", "case__title"]


@admin.register(ChatThreadParticipant)
class ChatThreadParticipantAdmin(admin.ModelAdmin):
    list_display = ["thread", "user", "can_reply", "last_read_at"]
    list_filter = ["can_reply"]
    search_fields = ["thread__subject", "user__email", "user__first_name", "user__last_name"]


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ["thread", "sender", "message_type", "is_system_message", "created_at"]
    list_filter = ["message_type", "is_system_message"]
    search_fields = ["body", "sender__email", "thread__subject"]