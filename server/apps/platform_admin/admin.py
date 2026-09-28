from django.contrib import admin

from apps.platform_admin.models import FirmOnboardingRequest, PlatformActivity


@admin.register(FirmOnboardingRequest)
class FirmOnboardingRequestAdmin(admin.ModelAdmin):
    list_display = ("firm_name", "contact_name", "email", "phone_number", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("firm_name", "contact_name", "email")


@admin.register(PlatformActivity)
class PlatformActivityAdmin(admin.ModelAdmin):
    list_display = ("created_at", "action", "summary", "actor", "firm")
    list_filter = ("action",)
    readonly_fields = ("actor", "action", "firm", "summary", "created_at")
