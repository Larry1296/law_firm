from django.contrib import admin
from apps.clients.models import IntakePrivacyConfig


@admin.register(IntakePrivacyConfig)
class IntakePrivacyConfigAdmin(admin.ModelAdmin):
    list_display = ('firm', 'policy_version', 'lawful_basis', 'status', 'effective_date', 'approved_by', 'activated_at', 'retired_at')
    list_filter = ('status',)

    def get_queryset(self, request):
        # Management is performed through the firm-scoped, audited application UI.
        from apps.common.choices import UserRole
        queryset = super().get_queryset(request)
        if not request.user.is_active or request.user.role != UserRole.ADMIN:
            return queryset.none()
        if hasattr(request.user, 'owned_firm'):
            return queryset.filter(firm=request.user.owned_firm)
        return queryset.filter(firm__members__user=request.user, firm__members__is_active=True).distinct()

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
