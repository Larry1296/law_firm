from django.contrib import admin

# Register your models here.

from apps.clients.models import IntakePrivacyConfig

@admin.register(IntakePrivacyConfig)
class IntakePrivacyConfigAdmin(admin.ModelAdmin):
    list_display = ("firm", "policy_version", "lawful_basis", "is_active", "approved_by", "approved_at")
