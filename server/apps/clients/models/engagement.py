import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class EngagementRecord(TimestampedModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Drafting"
        SENT = "SENT", "Sent to client"
        SIGNED = "SIGNED", "Signed"
        FEE_TERMS_CONFIRMED = "FEE_TERMS_CONFIRMED", "Fee terms confirmed"
        RETAINER_PENDING = "RETAINER_PENDING", "Retainer required"
        READY = "READY", "Opening requirements satisfied"
        WAIVED = "WAIVED", "Waived with approval"
        NOT_REQUIRED = "NOT_REQUIRED", "Not required under firm policy"
        SUPERSEDED = "SUPERSEDED", "Superseded"
        CANCELLED = "CANCELLED", "Cancelled"
        LEGACY_REVIEW_REQUIRED = "LEGACY_REVIEW_REQUIRED", "Legacy review required"

    class FeeArrangement(models.TextChoices):
        CONSULTATION = "CONSULTATION", "Consultation fee"
        FIXED = "FIXED", "Fixed or agreed fee"
        HOURLY = "HOURLY", "Hourly fee"
        STAGE_BASED = "STAGE_BASED", "Stage-based fee"
        MONTHLY_RETAINER = "MONTHLY_RETAINER", "Monthly retainer"
        REMUNERATION_ORDER = "REMUNERATION_ORDER", "Advocates Remuneration Order"
        OTHER = "OTHER", "Other approved arrangement"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="engagements")
    client = models.ForeignKey("clients.Client", on_delete=models.PROTECT, related_name="engagements")
    proposed_matter = models.ForeignKey(
        "clients.ClientMatterConflictCheck", on_delete=models.PROTECT, related_name="engagements"
    )
    matter = models.ForeignKey(
        "cases.Case", on_delete=models.PROTECT, null=True, blank=True, related_name="engagements"
    )
    version = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.DRAFT, db_index=True)
    responsible_advocate = models.ForeignKey(
        "staff.Lawyer", on_delete=models.PROTECT, related_name="responsible_engagements"
    )
    scope_of_work = models.TextField()
    excluded_work = models.TextField(blank=True, default="")
    client_objectives = models.TextField(blank=True, default="")
    communication_method = models.CharField(max_length=80, blank=True, default="")
    reporting_expectations = models.TextField(blank=True, default="")
    fee_arrangement_type = models.CharField(max_length=32, choices=FeeArrangement.choices)
    fee_arrangement_description = models.TextField()
    estimated_professional_fees = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    estimated_disbursements = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    required_retainer = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    retainer_due_date = models.DateField(null=True, blank=True)
    retainer_received = models.BooleanField(default=False)
    engagement_letter_document = models.ForeignKey(
        "clients.ClientDocument", on_delete=models.PROTECT, null=True, blank=True,
        related_name="engagement_letters",
    )
    sent_at = models.DateTimeField(null=True, blank=True)
    signed_at = models.DateTimeField(null=True, blank=True)
    signed_by = models.CharField(max_length=255, blank=True, default="")
    authority_to_act_documents = models.ManyToManyField(
        "clients.ClientDocument", blank=True, related_name="authority_engagements"
    )
    internally_approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True,
        related_name="approved_engagements",
    )
    exception_reason = models.TextField(blank=True, default="")
    exception_policy_basis = models.TextField(blank=True, default="")
    exception_approved_at = models.DateTimeField(null=True, blank=True)
    exception_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True,
        related_name="approved_engagement_exceptions",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_engagements"
    )

    class Meta:
        db_table = "client_engagements"
        ordering = ["-version", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["proposed_matter", "version"], name="unique_engagement_version_per_proposal"
            ),
            models.UniqueConstraint(
                fields=["proposed_matter"],
                condition=models.Q(status__in=["DRAFT", "SENT", "SIGNED", "FEE_TERMS_CONFIRMED", "RETAINER_PENDING", "READY", "WAIVED", "NOT_REQUIRED", "LEGACY_REVIEW_REQUIRED"]),
                name="one_current_engagement_per_proposal",
            ),
        ]

    def clean(self):
        if self.client_id and self.firm_id and self.client.firm_id != self.firm_id:
            raise ValidationError({"client": "Client belongs to another firm."})
        if self.proposed_matter_id and (
            self.proposed_matter.firm_id != self.firm_id or self.proposed_matter.client_id != self.client_id
        ):
            raise ValidationError({"proposed_matter": "Proposed matter belongs to another firm or client."})
        if self.matter_id and (self.matter.firm_id != self.firm_id or self.matter.client_id != self.client_id):
            raise ValidationError({"matter": "Matter belongs to another firm or client."})
        if self.responsible_advocate_id and self.responsible_advocate.law_firm_id != self.firm_id:
            raise ValidationError({"responsible_advocate": "Advocate belongs to another firm."})
        if self.engagement_letter_document_id and self.engagement_letter_document.client_id != self.client_id:
            raise ValidationError({"engagement_letter_document": "Engagement letter belongs to another client."})
        if self.status in {self.Status.WAIVED, self.Status.NOT_REQUIRED} and not (
            self.exception_reason.strip() and self.exception_policy_basis.strip()
            and self.exception_approved_by_id and self.exception_approved_at
        ):
            raise ValidationError({"status": "An exception requires an approver, reason, policy basis and timestamp."})

    @property
    def permits_opening(self):
        if self.status == self.Status.READY:
            return True
        return self.status in {self.Status.WAIVED, self.Status.NOT_REQUIRED} and bool(
            self.exception_reason.strip() and self.exception_policy_basis.strip()
            and self.exception_approved_by_id and self.exception_approved_at
        )


class EngagementHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    engagement = models.ForeignKey(EngagementRecord, on_delete=models.PROTECT, related_name="history")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="engagement_history")
    action = models.CharField(max_length=50)
    previous_values = models.JSONField(default=dict)
    new_values = models.JSONField(default=dict)
    reason = models.TextField(blank=True, default="")
    correlation_id = models.CharField(max_length=100, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "client_engagement_history"
        ordering = ["created_at"]
