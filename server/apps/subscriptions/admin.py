from django.contrib import admin, messages
from rest_framework.exceptions import ValidationError

from apps.subscriptions.models import FirmSubscription, Plan, SubscriptionInvoice
from apps.subscriptions.services import SubscriptionService


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = (
        "name", "code", "monthly_price", "annual_price", "max_advocates",
        "max_support_staff", "max_active_matters", "max_branches", "is_public", "is_active",
    )
    list_editable = ("is_public", "is_active")


@admin.register(FirmSubscription)
class FirmSubscriptionAdmin(admin.ModelAdmin):
    list_display = ("firm", "plan", "status", "billing_cycle", "trial_ends_at", "current_period_end")
    list_filter = ("status", "plan", "billing_cycle")
    search_fields = ("firm__name",)


@admin.register(SubscriptionInvoice)
class SubscriptionInvoiceAdmin(admin.ModelAdmin):
    list_display = ("number", "firm", "plan", "billing_cycle", "total", "status", "mpesa_receipt", "payment_submitted_at")
    list_filter = ("status", "plan")
    search_fields = ("number", "firm__name", "mpesa_receipt")
    readonly_fields = (
        "number", "firm", "plan", "billing_cycle", "list_price", "proration_credit", "amount_excl_vat",
        "vat_rate", "vat_amount", "total", "issued_by", "mpesa_receipt", "payer_phone",
        "payment_submitted_by", "payment_submitted_at", "confirmed_by", "confirmed_at",
    )
    actions = ["confirm_mpesa_payment"]

    @admin.action(description="Confirm M-Pesa payment (checked against the Paybill statement)")
    def confirm_mpesa_payment(self, request, queryset):
        for invoice in queryset:
            try:
                SubscriptionService.confirm_payment(invoice=invoice, confirmed_by=request.user)
            except ValidationError as exc:
                self.message_user(request, f"{invoice.number}: {exc.detail}", messages.ERROR)
            else:
                self.message_user(request, f"{invoice.number} confirmed; subscription extended.")
