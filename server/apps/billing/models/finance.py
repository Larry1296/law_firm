import uuid
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q

from apps.common.models.timestamped_model import TimestampedModel


class ImmutableFinancialQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise ValidationError("Posted financial records cannot be changed; create a reversal or adjustment.")

    def delete(self):
        raise ValidationError("Posted financial records cannot be deleted; create a reversal or adjustment.")


class FinancialAccount(TimestampedModel):
    class AccountType(models.TextChoices):
        OFFICE = "OFFICE", "Office account"
        CLIENT = "CLIENT", "Client account"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="financial_accounts")
    name = models.CharField(max_length=255)
    account_type = models.CharField(max_length=16, choices=AccountType.choices)
    currency = models.CharField(max_length=3, default="KES")
    bank_name = models.CharField(max_length=255, blank=True, default="")
    account_reference = models.CharField(max_length=120)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "billing_financial_accounts"
        constraints = [models.UniqueConstraint(fields=["firm", "account_reference"], name="unique_financial_account_per_firm")]


class TaxConfiguration(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="tax_configurations")
    effective_from = models.DateField()
    vat_registered = models.BooleanField(default=False)
    vat_registration_number = models.CharField(max_length=80, blank=True, default="")
    vat_rate = models.DecimalField(max_digits=6, decimal_places=3, default=0)
    tax_inclusive = models.BooleanField(default=False)
    withholding_tax_enabled = models.BooleanField(default=False)
    withholding_tax_rate = models.DecimalField(max_digits=6, decimal_places=3, default=0)
    withholding_tax_label = models.CharField(max_length=120, blank=True, default="")
    exempt_or_zero_rated_label = models.CharField(max_length=255, blank=True, default="")
    default_currency = models.CharField(max_length=3, default="KES")
    rounding_policy = models.CharField(max_length=80, default="HALF_UP")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "billing_tax_configurations"
        ordering = ["-effective_from", "-created_at"]
        constraints = [models.UniqueConstraint(fields=["firm", "effective_from"], name="unique_tax_configuration_effective_date")]

    def clean(self):
        if self.vat_rate < 0 or self.withholding_tax_rate < 0:
            raise ValidationError("Tax rates cannot be negative.")
        if self.vat_registered and not self.vat_registration_number.strip():
            raise ValidationError({"vat_registration_number": "A VAT registration number is required when VAT registration is enabled."})


class Invoice(TimestampedModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PENDING_APPROVAL = "PENDING_APPROVAL", "Pending approval"
        APPROVED = "APPROVED", "Approved"
        ISSUED = "ISSUED", "Issued"
        PARTIALLY_PAID = "PARTIALLY_PAID", "Partially paid"
        PAID = "PAID", "Paid"
        OVERDUE = "OVERDUE", "Overdue"
        DISPUTED = "DISPUTED", "Disputed"
        CANCELLED = "CANCELLED", "Cancelled"
        CREDITED = "CREDITED", "Credited"
        LEGACY_REVIEW_REQUIRED = "LEGACY_REVIEW_REQUIRED", "Legacy review required"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="invoices")
    client = models.ForeignKey("clients.Client", on_delete=models.PROTECT, related_name="invoices")
    matter = models.ForeignKey("cases.Case", on_delete=models.PROTECT, related_name="invoices")
    invoice_number = models.CharField(max_length=60)
    invoice_date = models.DateField()
    due_date = models.DateField()
    currency = models.CharField(max_length=3, default="KES")
    professional_fees = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    disbursements_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    discount_adjustment = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    amount_paid = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    credited_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    tax_configuration_snapshot = models.JSONField(default=dict, blank=True)
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.DRAFT, db_index=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_invoices")
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="approved_invoices")
    approved_at = models.DateTimeField(null=True, blank=True)
    issued_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True, default="")
    supporting_documents = models.ManyToManyField("clients.ClientDocument", blank=True, related_name="supported_invoices")

    class Meta:
        db_table = "billing_invoices"
        constraints = [
            models.UniqueConstraint(fields=["firm", "invoice_number"], name="unique_invoice_number_per_firm"),
            models.CheckConstraint(condition=Q(total_amount__gte=0), name="invoice_total_nonnegative"),
            models.CheckConstraint(condition=Q(amount_paid__gte=0), name="invoice_paid_nonnegative"),
            models.CheckConstraint(condition=Q(credited_amount__gte=0), name="invoice_credited_nonnegative"),
            models.CheckConstraint(condition=Q(balance__gte=0), name="invoice_balance_nonnegative"),
            models.CheckConstraint(
                condition=Q(amount_paid__lte=F("total_amount") - F("credited_amount")),
                name="invoice_paid_and_credited_within_total",
            ),
        ]

    def clean(self):
        if self.client_id and self.firm_id and self.client.firm_id != self.firm_id:
            raise ValidationError({"client": "Client belongs to another firm."})
        if self.matter_id and (self.matter.firm_id != self.firm_id or self.matter.client_id != self.client_id):
            raise ValidationError({"matter": "Matter belongs to another firm or client."})
        if self.due_date and self.invoice_date and self.due_date < self.invoice_date:
            raise ValidationError({"due_date": "Due date cannot precede invoice date."})


class InvoiceLine(models.Model):
    class LineType(models.TextChoices):
        PROFESSIONAL_FEE = "PROFESSIONAL_FEE", "Professional fee"
        TAX = "TAX", "Tax"
        DISBURSEMENT = "DISBURSEMENT", "Disbursement"
        DISCOUNT = "DISCOUNT", "Discount"
        ADJUSTMENT = "ADJUSTMENT", "Adjustment"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="line_items")
    line_type = models.CharField(max_length=24, choices=LineType.choices)
    description = models.TextField()
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    time_entry = models.OneToOneField(
        "billing.TimeEntry", on_delete=models.PROTECT, null=True, blank=True,
        related_name="invoice_line",
    )
    disbursement = models.OneToOneField(
        "billing.Disbursement", on_delete=models.PROTECT, null=True, blank=True,
        related_name="invoice_line",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "billing_invoice_lines"
        constraints = [models.CheckConstraint(condition=Q(quantity__gt=0), name="invoice_line_quantity_positive")]


class CreditNote(TimestampedModel):
    class Status(models.TextChoices):
        PENDING_APPROVAL = "PENDING_APPROVAL", "Pending approval"
        APPROVED = "APPROVED", "Approved"
        ISSUED = "ISSUED", "Issued"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="credit_notes")
    client = models.ForeignKey("clients.Client", on_delete=models.PROTECT, related_name="credit_notes")
    matter = models.ForeignKey("cases.Case", on_delete=models.PROTECT, related_name="credit_notes")
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="credit_notes")
    credit_note_number = models.CharField(max_length=60)
    credit_date = models.DateField()
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    reason = models.TextField()
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.PENDING_APPROVAL)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_credit_notes")
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="approved_credit_notes")
    approved_at = models.DateTimeField(null=True, blank=True)
    issued_at = models.DateTimeField(null=True, blank=True)
    supporting_documents = models.ManyToManyField("clients.ClientDocument", blank=True, related_name="supported_credit_notes")

    class Meta:
        db_table = "billing_credit_notes"
        constraints = [
            models.UniqueConstraint(fields=["firm", "credit_note_number"], name="unique_credit_note_number_per_firm"),
            models.CheckConstraint(condition=Q(amount__gt=0), name="credit_note_amount_positive"),
        ]

    def clean(self):
        if self.invoice_id and (
            self.invoice.firm_id != self.firm_id or self.invoice.client_id != self.client_id
            or self.invoice.matter_id != self.matter_id
        ):
            raise ValidationError("Credit note, invoice, client and matter must belong to the same firm record.")


class TimeEntry(TimestampedModel):
    class ApprovalStatus(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PENDING = "PENDING", "Pending approval"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="time_entries")
    matter = models.ForeignKey("cases.Case", on_delete=models.PROTECT, related_name="time_entries")
    staff_member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="time_entries")
    activity = models.CharField(max_length=255)
    entry_date = models.DateField()
    duration_minutes = models.PositiveIntegerField()
    hourly_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    billable = models.BooleanField(default=True)
    narrative = models.TextField()
    approval_status = models.CharField(max_length=16, choices=ApprovalStatus.choices, default=ApprovalStatus.DRAFT)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="approved_time_entries")
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, null=True, blank=True, related_name="time_entries")

    class Meta:
        db_table = "billing_time_entries"
        constraints = [models.CheckConstraint(condition=Q(duration_minutes__gt=0), name="time_entry_duration_positive")]


class Disbursement(TimestampedModel):
    class FundingSource(models.TextChoices):
        FIRM = "FIRM", "Paid by firm"
        CLIENT_MONEY = "CLIENT_MONEY", "Paid from client funds"

    class ApprovalStatus(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PENDING = "PENDING", "Pending approval"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="disbursements")
    matter = models.ForeignKey("cases.Case", on_delete=models.PROTECT, related_name="disbursements")
    disbursement_type = models.CharField(max_length=80)
    description = models.TextField()
    supplier_payee = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3, default="KES")
    date_incurred = models.DateField()
    evidence_document = models.ForeignKey("clients.ClientDocument", on_delete=models.PROTECT, null=True, blank=True, related_name="evidenced_disbursements")
    funding_source = models.CharField(max_length=16, choices=FundingSource.choices)
    recoverable_from_client = models.BooleanField(default=True)
    approval_status = models.CharField(max_length=16, choices=ApprovalStatus.choices, default=ApprovalStatus.DRAFT)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_disbursements")
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="approved_disbursements")
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, null=True, blank=True, related_name="disbursements")

    class Meta:
        db_table = "billing_disbursements"
        constraints = [models.CheckConstraint(condition=Q(amount__gt=0), name="disbursement_amount_positive")]


class Receipt(TimestampedModel):
    objects = ImmutableFinancialQuerySet.as_manager()
    class PaymentMethod(models.TextChoices):
        CASH = "CASH", "Cash"
        BANK_TRANSFER = "BANK_TRANSFER", "Bank transfer"
        CHEQUE = "CHEQUE", "Cheque"
        CARD = "CARD", "Card"
        MOBILE_MONEY = "MOBILE_MONEY", "Mobile money"
        OTHER = "OTHER", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="receipts")
    receipt_number = models.CharField(max_length=60)
    client = models.ForeignKey("clients.Client", on_delete=models.PROTECT, related_name="receipts")
    matter = models.ForeignKey("cases.Case", on_delete=models.PROTECT, null=True, blank=True, related_name="receipts")
    proposed_matter = models.ForeignKey(
        "clients.ClientMatterConflictCheck", on_delete=models.PROTECT, null=True, blank=True,
        related_name="retainer_receipts",
    )
    engagement = models.ForeignKey(
        "clients.EngagementRecord", on_delete=models.PROTECT, null=True, blank=True,
        related_name="retainer_receipts",
    )
    amount_received = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3, default="KES")
    payment_date = models.DateField()
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    bank_transaction_reference = models.CharField(max_length=150)
    account = models.ForeignKey(FinancialAccount, on_delete=models.PROTECT, related_name="receipts")
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="recorded_receipts")
    supporting_proof = models.ForeignKey("clients.ClientDocument", on_delete=models.PROTECT, null=True, blank=True, related_name="supported_receipts")
    reversed_by = models.OneToOneField("self", on_delete=models.PROTECT, null=True, blank=True, related_name="reverses_receipt")
    reversal_reason = models.TextField(blank=True, default="")

    class Meta:
        db_table = "billing_receipts"
        constraints = [
            models.UniqueConstraint(fields=["firm", "receipt_number"], name="unique_receipt_number_per_firm"),
            models.CheckConstraint(condition=Q(amount_received__gt=0), name="receipt_amount_positive"),
            models.CheckConstraint(
                condition=(
                    Q(matter__isnull=False, proposed_matter__isnull=True, engagement__isnull=True)
                    | Q(matter__isnull=True, proposed_matter__isnull=False, engagement__isnull=False)
                ),
                name="receipt_has_matter_or_prematter_context",
            ),
        ]

    def save(self, *args, **kwargs):
        if self.pk and type(self).objects.filter(pk=self.pk).exists():
            raise ValidationError("Receipts are immutable; create a reversal or adjustment.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Receipts cannot be deleted.")


class ReceiptAllocation(models.Model):
    objects = ImmutableFinancialQuerySet.as_manager()
    class AllocationType(models.TextChoices):
        INVOICE = "INVOICE", "Invoice"
        RETAINER = "RETAINER", "Retainer"
        CLIENT_MONEY = "CLIENT_MONEY", "Client money"
        DISBURSEMENT = "DISBURSEMENT", "Disbursement"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    receipt = models.ForeignKey(Receipt, on_delete=models.PROTECT, related_name="allocations")
    allocation_type = models.CharField(max_length=20, choices=AllocationType.choices)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, null=True, blank=True, related_name="receipt_allocations")
    engagement = models.ForeignKey(
        "clients.EngagementRecord", on_delete=models.PROTECT, null=True, blank=True,
        related_name="receipt_allocations",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "billing_receipt_allocations"
        constraints = [
            models.CheckConstraint(condition=Q(amount__gt=0), name="receipt_allocation_positive"),
            models.CheckConstraint(
                condition=~Q(allocation_type="INVOICE") | Q(invoice__isnull=False),
                name="invoice_allocation_requires_invoice",
            ),
            models.CheckConstraint(
                condition=~Q(allocation_type="RETAINER") | Q(engagement__isnull=False),
                name="retainer_allocation_requires_engagement",
            ),
        ]

    def save(self, *args, **kwargs):
        if self.pk and type(self).objects.filter(pk=self.pk).exists():
            raise ValidationError("Receipt allocations are immutable.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Receipt allocations cannot be deleted.")


class ReceiptReversal(models.Model):
    objects = ImmutableFinancialQuerySet.as_manager()
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="receipt_reversals")
    original_receipt = models.OneToOneField(Receipt, on_delete=models.PROTECT, related_name="reversal_record")
    original_transaction = models.ForeignKey("billing.LedgerTransaction", on_delete=models.PROTECT, related_name="receipt_reversal_sources")
    reversal_transaction = models.OneToOneField("billing.LedgerTransaction", on_delete=models.PROTECT, related_name="receipt_reversal_record")
    reason = models.TextField()
    reversed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="recorded_receipt_reversals")
    reversed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "billing_receipt_reversals"

    def save(self, *args, **kwargs):
        if self.pk and type(self).objects.filter(pk=self.pk).exists():
            raise ValidationError("Receipt reversal records are immutable.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Receipt reversal records cannot be deleted.")


class MatterClientLedger(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="client_ledgers")
    client = models.ForeignKey("clients.Client", on_delete=models.PROTECT, related_name="client_ledgers")
    matter = models.OneToOneField("cases.Case", on_delete=models.PROTECT, related_name="client_ledger")
    currency = models.CharField(max_length=3, default="KES")
    cleared_balance = models.DecimalField(max_digits=16, decimal_places=2, default=0)

    class Meta:
        db_table = "billing_matter_client_ledgers"
        constraints = [models.CheckConstraint(condition=Q(cleared_balance__gte=0), name="client_ledger_balance_nonnegative")]


class ClientFundsLedger(TimestampedModel):
    """Client money received before it can be allocated to an opened matter."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="unallocated_client_funds_ledgers")
    client = models.OneToOneField("clients.Client", on_delete=models.PROTECT, related_name="unallocated_funds_ledger")
    currency = models.CharField(max_length=3, default="KES")
    cleared_balance = models.DecimalField(max_digits=16, decimal_places=2, default=0)

    class Meta:
        db_table = "billing_client_funds_ledgers"
        constraints = [
            models.UniqueConstraint(fields=["firm", "client"], name="unique_unallocated_funds_ledger_per_client"),
            models.CheckConstraint(condition=Q(cleared_balance__gte=0), name="unallocated_client_funds_nonnegative"),
        ]


class LedgerTransaction(models.Model):
    class Direction(models.TextChoices):
        CREDIT = "CREDIT", "Credit"
        DEBIT = "DEBIT", "Debit"

    class TransactionType(models.TextChoices):
        CLIENT_RECEIPT = "CLIENT_RECEIPT", "Client-money receipt"
        CLIENT_PAYMENT = "CLIENT_PAYMENT", "Client-money payment"
        TRANSFER_TO_OFFICE = "TRANSFER_TO_OFFICE", "Transfer to office account"
        OFFICE_RECEIPT = "OFFICE_RECEIPT", "Office-money receipt"
        REVERSAL = "REVERSAL", "Reversal"
        ADJUSTMENT = "ADJUSTMENT", "Controlled adjustment"
        RETAINER_RECEIPT = "RETAINER_RECEIPT", "Pre-matter retainer receipt"
        RETAINER_ALLOCATION = "RETAINER_ALLOCATION", "Retainer allocated to opened matter"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="ledger_transactions")
    account = models.ForeignKey(FinancialAccount, on_delete=models.PROTECT, related_name="transactions")
    ledger = models.ForeignKey(MatterClientLedger, on_delete=models.PROTECT, null=True, blank=True, related_name="transactions")
    client_funds_ledger = models.ForeignKey(ClientFundsLedger, on_delete=models.PROTECT, null=True, blank=True, related_name="transactions")
    matter = models.ForeignKey("cases.Case", on_delete=models.PROTECT, null=True, blank=True, related_name="ledger_transactions")
    client = models.ForeignKey("clients.Client", on_delete=models.PROTECT, related_name="ledger_transactions")
    engagement = models.ForeignKey(
        "clients.EngagementRecord", on_delete=models.PROTECT, null=True, blank=True,
        related_name="ledger_transactions",
    )
    transaction_type = models.CharField(max_length=24, choices=TransactionType.choices)
    direction = models.CharField(max_length=8, choices=Direction.choices)
    amount = models.DecimalField(max_digits=16, decimal_places=2)
    currency = models.CharField(max_length=3, default="KES")
    narrative = models.TextField()
    bank_reference = models.CharField(max_length=150, blank=True, default="")
    basis = models.TextField(blank=True, default="")
    correlation_id = models.UUIDField(default=uuid.uuid4, db_index=True)
    original_transaction = models.ForeignKey("self", on_delete=models.PROTECT, null=True, blank=True, related_name="reversal_entries")
    receipt = models.ForeignKey(Receipt, on_delete=models.PROTECT, null=True, blank=True, related_name="ledger_transactions")
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, null=True, blank=True, related_name="ledger_transactions")
    posted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="posted_ledger_transactions")
    posted_at = models.DateTimeField(auto_now_add=True)
    objects = ImmutableFinancialQuerySet.as_manager()

    class Meta:
        db_table = "billing_ledger_transactions"
        ordering = ["posted_at", "id"]
        constraints = [
            models.CheckConstraint(condition=Q(amount__gt=0), name="ledger_transaction_amount_positive"),
            models.CheckConstraint(
                condition=Q(ledger__isnull=True) | Q(client_funds_ledger__isnull=True),
                name="transaction_cannot_use_two_client_ledgers",
            ),
        ]

    def save(self, *args, **kwargs):
        if self.pk and type(self).objects.filter(pk=self.pk).exists():
            raise ValidationError("Posted ledger transactions are immutable; create a reversal or adjustment.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Posted ledger transactions cannot be deleted.")


class PaymentInstruction(TimestampedModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PENDING_APPROVAL = "PENDING_APPROVAL", "Pending approval"
        APPROVED = "APPROVED", "Approved"
        POSTED = "POSTED", "Posted"
        REJECTED = "REJECTED", "Rejected"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="payment_instructions")
    matter = models.ForeignKey("cases.Case", on_delete=models.PROTECT, related_name="payment_instructions")
    ledger = models.ForeignKey(MatterClientLedger, on_delete=models.PROTECT, related_name="payment_instructions")
    account = models.ForeignKey(FinancialAccount, on_delete=models.PROTECT, related_name="payment_instructions")
    beneficiary_name = models.CharField(max_length=255)
    beneficiary_details = models.JSONField(default=dict)
    amount = models.DecimalField(max_digits=16, decimal_places=2)
    currency = models.CharField(max_length=3, default="KES")
    purpose = models.TextField()
    payment_basis = models.TextField()
    supporting_documents = models.ManyToManyField("clients.ClientDocument", blank=True, related_name="supported_payment_instructions")
    maker = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="made_payment_instructions")
    checker = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="checked_payment_instructions")
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.PENDING_APPROVAL)
    approved_at = models.DateTimeField(null=True, blank=True)
    posted_transaction = models.OneToOneField(LedgerTransaction, on_delete=models.PROTECT, null=True, blank=True, related_name="payment_instruction")
    rejection_reason = models.TextField(blank=True, default="")

    class Meta:
        db_table = "billing_payment_instructions"
        constraints = [models.CheckConstraint(condition=Q(amount__gt=0), name="payment_instruction_amount_positive")]


class AccountReconciliation(TimestampedModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        APPROVED = "APPROVED", "Approved"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="account_reconciliations")
    account = models.ForeignKey(FinancialAccount, on_delete=models.PROTECT, related_name="reconciliations")
    period_end = models.DateField()
    statement_balance = models.DecimalField(max_digits=16, decimal_places=2)
    ledger_balance = models.DecimalField(max_digits=16, decimal_places=2)
    difference = models.DecimalField(max_digits=16, decimal_places=2)
    reconciliation_data = models.JSONField(default=dict)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    prepared_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="prepared_reconciliations")
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="approved_reconciliations")
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "billing_account_reconciliations"
        constraints = [models.UniqueConstraint(fields=["account", "period_end"], name="unique_reconciliation_period_per_account")]

    def save(self, *args, **kwargs):
        if self.pk:
            existing = type(self).objects.filter(pk=self.pk).first()
            if existing and existing.status == self.Status.APPROVED:
                raise ValidationError("Approved reconciliations are immutable.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.status == self.Status.APPROVED:
            raise ValidationError("Approved reconciliations cannot be deleted.")
        return super().delete(*args, **kwargs)
