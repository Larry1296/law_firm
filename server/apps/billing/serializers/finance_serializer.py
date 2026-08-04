from decimal import Decimal

from rest_framework import serializers

from apps.billing.models import (
    AccountReconciliation, CreditNote, Disbursement, FinancialAccount, Invoice, InvoiceLine,
    LedgerTransaction, MatterClientLedger, PaymentInstruction, Receipt,
    ReceiptAllocation, TimeEntry,
)


class FinancialAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialAccount
        fields = "__all__"
        read_only_fields = ("firm",)


class InvoiceLineInputSerializer(serializers.Serializer):
    line_type = serializers.ChoiceField(choices=InvoiceLine.LineType.choices)
    description = serializers.CharField()
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0.01"))
    unit_price = serializers.DecimalField(max_digits=14, decimal_places=2)


class InvoiceSerializer(serializers.ModelSerializer):
    line_items = InvoiceLineInputSerializer(many=True, write_only=True, required=False)
    rendered_line_items = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        exclude = ("supporting_documents",)
        read_only_fields = (
            "firm", "created_by", "professional_fees", "tax_amount", "disbursements_total",
            "discount_adjustment", "total_amount", "amount_paid", "balance", "status",
            "approved_by", "approved_at", "issued_at", "cancellation_reason",
        )

    def get_rendered_line_items(self, obj):
        return [{
            "id": item.id, "line_type": item.line_type, "description": item.description,
            "quantity": item.quantity, "unit_price": item.unit_price, "amount": item.amount,
        } for item in obj.line_items.all()]


class InvoiceBillableItemsSerializer(serializers.Serializer):
    time_entry_ids = serializers.ListField(child=serializers.UUIDField(), required=False, default=list)
    disbursement_ids = serializers.ListField(child=serializers.UUIDField(), required=False, default=list)

    def validate(self, attrs):
        if not attrs["time_entry_ids"] and not attrs["disbursement_ids"]:
            raise serializers.ValidationError("Select at least one approved billable item.")
        return attrs


class InvoiceCancellationSerializer(serializers.Serializer):
    reason = serializers.CharField()


class CreditNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreditNote
        exclude = ("supporting_documents",)
        read_only_fields = (
            "firm", "client", "matter", "status", "created_by", "approved_by",
            "approved_at", "issued_at",
        )


class ClientMoneyReceiptSerializer(serializers.Serializer):
    matter = serializers.UUIDField()
    account = serializers.UUIDField()
    receipt_number = serializers.CharField(max_length=60)
    amount_received = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0.01"))
    currency = serializers.CharField(max_length=3, default="KES")
    payment_date = serializers.DateField()
    payment_method = serializers.ChoiceField(choices=Receipt.PaymentMethod.choices)
    bank_transaction_reference = serializers.CharField(max_length=150)
    supporting_proof = serializers.PrimaryKeyRelatedField(
        queryset=Receipt._meta.get_field("supporting_proof").remote_field.model.objects.all(),
        allow_null=True, required=False,
    )


class PreMatterRetainerReceiptSerializer(ClientMoneyReceiptSerializer):
    matter = serializers.UUIDField(required=False, allow_null=True)
    client = serializers.UUIDField()
    proposed_matter = serializers.UUIDField()
    engagement = serializers.UUIDField()


class PaymentInstructionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentInstruction
        exclude = ("supporting_documents",)
        read_only_fields = (
            "firm", "ledger", "maker", "checker", "status", "approved_at", "posted_transaction",
            "rejection_reason",
        )


class PaymentRequestSerializer(serializers.Serializer):
    matter = serializers.UUIDField()
    account = serializers.UUIDField()
    beneficiary_name = serializers.CharField(max_length=255)
    beneficiary_details = serializers.JSONField()
    amount = serializers.DecimalField(max_digits=16, decimal_places=2, min_value=Decimal("0.01"))
    currency = serializers.CharField(max_length=3, default="KES")
    purpose = serializers.CharField()
    payment_basis = serializers.CharField()


class OfficeTransferSerializer(serializers.Serializer):
    invoice = serializers.UUIDField()
    client_account = serializers.UUIDField()
    office_account = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=16, decimal_places=2, min_value=Decimal("0.01"))
    basis = serializers.CharField()


class ReversalSerializer(serializers.Serializer):
    reason = serializers.CharField()


class LedgerTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LedgerTransaction
        fields = "__all__"


class MatterClientLedgerSerializer(serializers.ModelSerializer):
    transactions = LedgerTransactionSerializer(many=True, read_only=True)

    class Meta:
        model = MatterClientLedger
        fields = "__all__"


class TimeEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeEntry
        fields = "__all__"
        read_only_fields = ("firm", "approval_status", "approved_by", "invoice")


class DisbursementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Disbursement
        fields = "__all__"
        read_only_fields = ("firm", "created_by", "approval_status", "approved_by", "invoice")


class ReceiptAllocationInputSerializer(serializers.Serializer):
    allocation_type = serializers.ChoiceField(choices=ReceiptAllocation.AllocationType.choices)
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0.01"))
    invoice = serializers.PrimaryKeyRelatedField(queryset=Invoice.objects.all(), required=False, allow_null=True)


class OfficeMoneyReceiptSerializer(ClientMoneyReceiptSerializer):
    allocations = ReceiptAllocationInputSerializer(many=True, allow_empty=False)


class AccountReconciliationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountReconciliation
        fields = "__all__"
        read_only_fields = (
            "firm", "ledger_balance", "difference", "status", "prepared_by", "approved_by", "approved_at",
        )
