import uuid

from django.core.validators import MinValueValidator
from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class Plan(TimestampedModel):
    """A SaaS tier. A null limit means unlimited."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=80)
    tagline = models.CharField(max_length=255, blank=True)
    monthly_price = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(0)],
        help_text="KES per month, excluding VAT.",
    )
    annual_price = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(0)],
        help_text="KES per year, excluding VAT.",
    )
    max_advocates = models.PositiveIntegerField(null=True, blank=True)
    max_support_staff = models.PositiveIntegerField(null=True, blank=True)
    max_active_matters = models.PositiveIntegerField(null=True, blank=True)
    max_branches = models.PositiveIntegerField(null=True, blank=True)
    features = models.JSONField(default=list, blank=True)
    is_public = models.BooleanField(default=True, help_text="Shown on the pricing page and sign-up.")
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "subscription_plans"
        ordering = ["sort_order", "monthly_price"]

    def __str__(self):
        return self.name

    def price_for(self, billing_cycle):
        return self.annual_price if billing_cycle == FirmSubscription.BillingCycle.ANNUAL else self.monthly_price


class FirmSubscription(TimestampedModel):
    class Status(models.TextChoices):
        TRIALING = "TRIALING", "Trial"
        ACTIVE = "ACTIVE", "Active"
        SUSPENDED = "SUSPENDED", "Suspended"
        CANCELLED = "CANCELLED", "Cancelled"

    class BillingCycle(models.TextChoices):
        MONTHLY = "MONTHLY", "Monthly"
        ANNUAL = "ANNUAL", "Annual"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.OneToOneField("firm.LawFirm", on_delete=models.CASCADE, related_name="subscription")
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="subscriptions")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TRIALING)
    billing_cycle = models.CharField(max_length=10, choices=BillingCycle.choices, default=BillingCycle.MONTHLY)
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(
        null=True, blank=True,
        help_text="Blank on an active subscription means it does not lapse (complimentary or legacy).",
    )
    grace_period_days = models.PositiveIntegerField(default=7)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "firm_subscriptions"

    def __str__(self):
        return f"{self.firm} — {self.plan} ({self.status})"


class SubscriptionInvoice(TimestampedModel):
    class Status(models.TextChoices):
        ISSUED = "ISSUED", "Awaiting payment"
        PAYMENT_SUBMITTED = "PAYMENT_SUBMITTED", "Payment submitted, awaiting confirmation"
        PAID = "PAID", "Paid"
        VOID = "VOID", "Void"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    number = models.CharField(max_length=30, unique=True)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="subscription_invoices")
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="invoices")
    billing_cycle = models.CharField(max_length=10, choices=FirmSubscription.BillingCycle.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ISSUED)

    list_price = models.DecimalField(max_digits=12, decimal_places=2)
    proration_credit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_excl_vat = models.DecimalField(max_digits=12, decimal_places=2)
    vat_rate = models.DecimalField(max_digits=5, decimal_places=2)
    vat_amount = models.DecimalField(max_digits=12, decimal_places=2)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="KES")

    issued_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, related_name="issued_subscription_invoices",
    )
    mpesa_receipt = models.CharField(max_length=20, blank=True)
    payer_phone = models.CharField(max_length=20, blank=True)
    payment_submitted_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="submitted_subscription_payments",
    )
    payment_submitted_at = models.DateTimeField(null=True, blank=True)
    confirmed_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="confirmed_subscription_payments",
    )
    confirmed_at = models.DateTimeField(null=True, blank=True)
    etims_invoice_number = models.CharField(
        max_length=50, blank=True,
        help_text="KRA eTIMS control/invoice number, recorded by platform finance.",
    )

    class Meta:
        db_table = "subscription_invoices"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["mpesa_receipt"],
                condition=~models.Q(mpesa_receipt=""),
                name="unique_subscription_mpesa_receipt",
            ),
        ]

    def __str__(self):
        return self.number
