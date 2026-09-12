import uuid

from django.conf import settings
from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class WalkInEnquirySequence(models.Model):
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.CASCADE)
    year = models.PositiveIntegerField()
    next_number = models.PositiveIntegerField(default=1)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["firm", "year"], name="unique_enquiry_firm_year")]


class WalkInEnquiry(TimestampedModel):
    class VisitorType(models.TextChoices):
        INDIVIDUAL = "INDIVIDUAL", "Individual"
        ORGANISATION_REPRESENTATIVE = "ORGANISATION_REPRESENTATIVE", "Representative of an organisation"

    class UrgencyType(models.TextChoices):
        NONE = "NONE", "No known urgency"
        COURT_DATE = "COURT_DATE", "Court date"
        LIMITATION_CONCERN = "LIMITATION_CONCERN", "Limitation concern"
        ARREST_OR_CUSTODY = "ARREST_OR_CUSTODY", "Arrest or custody"
        EVICTION = "EVICTION", "Eviction"
        OTHER = "OTHER", "Other urgent issue"

    class Status(models.TextChoices):
        RECEIVED_AWAITING_REVIEW = "RECEIVED_AWAITING_REVIEW", "Received — awaiting preliminary review"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="walk_in_enquiries")
    reference = models.CharField(max_length=32, editable=False)
    received_at = models.DateTimeField()
    visitor_name = models.CharField(max_length=255)
    safe_contact = models.CharField(max_length=255)
    visitor_type = models.CharField(max_length=40, choices=VisitorType.choices)
    organisation_name = models.CharField(max_length=255, blank=True)
    service_category = models.CharField(max_length=100)
    related_party_names = models.JSONField(default=list, blank=True)
    urgency_type = models.CharField(max_length=30, choices=UrgencyType.choices, default=UrgencyType.NONE)
    urgency_note = models.CharField(max_length=255, blank=True)
    critical_date = models.DateField(null=True, blank=True)
    referral_source = models.CharField(max_length=255, blank=True)
    description = models.CharField(max_length=500)
    privacy_acknowledged = models.BooleanField()
    received_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="received_walk_in_enquiries")
    status = models.CharField(max_length=40, choices=Status.choices, default=Status.RECEIVED_AWAITING_REVIEW, editable=False)

    class Meta:
        ordering = ["-received_at", "-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(fields=["firm", "reference"], name="unique_enquiry_firm_reference"),
            models.CheckConstraint(condition=models.Q(status="RECEIVED_AWAITING_REVIEW"), name="enquiry_received_status_only"),
            models.CheckConstraint(condition=models.Q(privacy_acknowledged=True), name="enquiry_privacy_acknowledged"),
        ]
