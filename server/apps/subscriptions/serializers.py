from rest_framework import serializers

from apps.subscriptions.models import FirmSubscription, SubscriptionInvoice


class InvoiceRequestSerializer(serializers.Serializer):
    plan_code = serializers.CharField()
    billing_cycle = serializers.ChoiceField(
        choices=FirmSubscription.BillingCycle.choices,
        default=FirmSubscription.BillingCycle.MONTHLY,
    )


class PaymentSubmissionSerializer(serializers.Serializer):
    mpesa_receipt = serializers.CharField(max_length=20)
    payer_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)


class SubscriptionInvoiceSerializer(serializers.ModelSerializer):
    plan_code = serializers.CharField(source="plan.code", read_only=True)
    plan_name = serializers.CharField(source="plan.name", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = SubscriptionInvoice
        fields = [
            "id", "number", "plan_code", "plan_name", "billing_cycle", "status", "status_label",
            "list_price", "proration_credit", "amount_excl_vat", "vat_rate", "vat_amount", "total",
            "currency", "mpesa_receipt", "payer_phone", "payment_submitted_at", "confirmed_at",
            "etims_invoice_number", "created_at",
        ]
