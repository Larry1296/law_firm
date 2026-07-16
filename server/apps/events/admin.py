from django.contrib import admin

from apps.events.models import EventClientAwareness


@admin.register(EventClientAwareness)
class EventClientAwarenessAdmin(admin.ModelAdmin):
    list_display = ("event", "client", "status", "notified_at", "confirmed_at", "updated_by")
    list_filter = ("status", "notified_at", "confirmed_at")
    search_fields = ("event__title", "event__case__case_number", "client__full_name")
