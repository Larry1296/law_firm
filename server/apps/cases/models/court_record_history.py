import uuid

from django.db import models

from apps.common.choices import JurisdictionStatus
from apps.common.models.timestamped_model import TimestampedModel


class JurisdictionAssessment(TimestampedModel):
    class Source(models.TextChoices):
        PRE_FILING_ASSESSMENT = "PRE_FILING_ASSESSMENT", "Pre-filing assessment"
        EXISTING_COURT_RECORD = "EXISTING_COURT_RECORD", "Existing court record"
        JURISDICTION_REVIEW = "JURISDICTION_REVIEW", "Jurisdiction review"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey("cases.Case", on_delete=models.CASCADE, related_name="jurisdiction_history")
    source = models.CharField(max_length=40, choices=Source.choices)
    status = models.CharField(max_length=50, choices=JurisdictionStatus.choices)
    trigger = models.TextField(blank=True, default="")
    date_raised = models.DateTimeField(null=True, blank=True)
    raised_by = models.CharField(max_length=255, blank=True, default="")
    proposed_court = models.CharField(max_length=255, blank=True, default="")
    proposed_station = models.CharField(max_length=255, blank=True, default="")
    subject_matter_basis = models.TextField(blank=True, default="")
    pecuniary_basis = models.TextField(blank=True, default="")
    territorial_basis = models.TextField(blank=True, default="")
    claim_value = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    legal_basis = models.TextField(blank=True, default="")
    assessment = models.TextField(blank=True, default="")
    court_directions_or_ruling = models.TextField(blank=True, default="")
    previous_court = models.CharField(max_length=255, blank=True, default="")
    new_court = models.CharField(max_length=255, blank=True, default="")
    effective_date = models.DateField(null=True, blank=True)
    information_source = models.CharField(max_length=255, blank=True, default="")
    recorded_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, related_name="recorded_jurisdiction_assessments"
    )
    confirmed_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, related_name="confirmed_jurisdiction_assessments"
    )
    supporting_documents = models.ManyToManyField(
        "cases.CaseAttachment", blank=True, related_name="jurisdiction_assessments"
    )

    class Meta:
        db_table = "case_jurisdiction_assessments"
        ordering = ["-created_at"]


class JudiciaryCTSSnapshot(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey("cases.Case", on_delete=models.CASCADE, related_name="cts_snapshots")
    official_case_number = models.CharField(max_length=120)
    cts_reference = models.CharField(max_length=120, blank=True, default="")
    efiling_reference = models.CharField(max_length=120, blank=True, default="")
    court = models.CharField(max_length=255, blank=True, default="")
    court_station = models.CharField(max_length=255, blank=True, default="")
    judiciary_status = models.CharField(max_length=255, blank=True, default="")
    latest_official_court_date = models.DateTimeField(null=True, blank=True)
    source = models.CharField(max_length=255)
    notes = models.TextField(blank=True, default="")
    checked_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, related_name="checked_cts_snapshots"
    )
    checked_at = models.DateTimeField()
    supporting_documents = models.ManyToManyField(
        "cases.CaseAttachment", blank=True, related_name="cts_snapshots"
    )

    class Meta:
        db_table = "case_judiciary_cts_snapshots"
        ordering = ["-checked_at"]
