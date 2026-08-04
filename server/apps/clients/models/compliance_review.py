import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class ClientComplianceReview(TimestampedModel):
    class VerificationStatus(models.TextChoices):
        UNKNOWN = "UNKNOWN", "Not recorded"
        LEGACY_REVIEW_REQUIRED = "LEGACY_REVIEW_REQUIRED", "Legacy review required"
        IN_PROGRESS = "IN_PROGRESS", "In progress"
        VERIFIED = "VERIFIED", "Verified"
        NOT_APPLICABLE = "NOT_APPLICABLE", "Not applicable"
        BLOCKED = "BLOCKED", "Blocked"

    class DueDiligenceStatus(models.TextChoices):
        UNKNOWN = "UNKNOWN", "Not recorded"
        LEGACY_REVIEW_REQUIRED = "LEGACY_REVIEW_REQUIRED", "Legacy review required"
        IN_PROGRESS = "IN_PROGRESS", "In progress"
        CLEARED = "CLEARED", "Cleared"
        ENHANCED_DUE_DILIGENCE = "ENHANCED_DUE_DILIGENCE", "Enhanced due diligence required"
        RESTRICTED = "RESTRICTED", "Opening restricted"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="client_compliance_reviews")
    client = models.OneToOneField("clients.Client", on_delete=models.PROTECT, related_name="compliance_review")
    identity_status = models.CharField(max_length=32, choices=VerificationStatus.choices, default=VerificationStatus.UNKNOWN)
    authority_status = models.CharField(max_length=32, choices=VerificationStatus.choices, default=VerificationStatus.UNKNOWN)
    beneficial_ownership_status = models.CharField(max_length=32, choices=VerificationStatus.choices, default=VerificationStatus.UNKNOWN)
    due_diligence_status = models.CharField(max_length=32, choices=DueDiligenceStatus.choices, default=DueDiligenceStatus.UNKNOWN)
    source_of_funds_required = models.BooleanField(default=False)
    source_of_funds_status = models.CharField(max_length=32, choices=VerificationStatus.choices, default=VerificationStatus.NOT_APPLICABLE)
    evidence = models.JSONField(default=dict, blank=True)
    review_notes = models.TextField(blank=True, default="")
    restriction_reason = models.TextField(blank=True, default="")
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True,
        related_name="reviewed_client_compliance",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "client_compliance_reviews"
        constraints = [
            models.UniqueConstraint(fields=["firm", "client"], name="unique_compliance_review_per_firm_client"),
        ]

    def clean(self):
        if self.client_id and self.firm_id and self.client.firm_id != self.firm_id:
            raise ValidationError({"client": "Client belongs to another firm."})
        if self.due_diligence_status in {
            self.DueDiligenceStatus.ENHANCED_DUE_DILIGENCE, self.DueDiligenceStatus.RESTRICTED,
        } and not self.restriction_reason.strip():
            raise ValidationError({"restriction_reason": "A due-diligence restriction reason is required."})
        if self.source_of_funds_required and self.source_of_funds_status == self.VerificationStatus.NOT_APPLICABLE:
            raise ValidationError({"source_of_funds_status": "Source-of-funds review is required."})

    @property
    def blocks_opening(self):
        return self.due_diligence_status in {
            self.DueDiligenceStatus.ENHANCED_DUE_DILIGENCE, self.DueDiligenceStatus.RESTRICTED,
        } or self.identity_status == self.VerificationStatus.BLOCKED or self.authority_status == self.VerificationStatus.BLOCKED


class ClientComplianceHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    review = models.ForeignKey(ClientComplianceReview, on_delete=models.PROTECT, related_name="history")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="client_compliance_history")
    action = models.CharField(max_length=50, default="REVIEW_RECORDED")
    previous_values = models.JSONField(default=dict)
    new_values = models.JSONField(default=dict)
    reason = models.TextField(blank=True, default="")
    correlation_id = models.CharField(max_length=100, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "client_compliance_history"
        ordering = ["created_at"]
