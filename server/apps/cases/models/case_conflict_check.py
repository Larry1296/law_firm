import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class CaseConflictCheck(TimestampedModel):
    class Status(models.TextChoices):
        NOT_STARTED = "NOT_STARTED", "Not started"
        PENDING = "PENDING", "Pending"
        CLEAR = "CLEAR", "Clear"
        POTENTIAL_CONFLICT = "POTENTIAL_CONFLICT", "Potential conflict"
        CONFLICT_CONFIRMED = "CONFLICT_CONFIRMED", "Conflict confirmed"
        WAIVER_PENDING = "WAIVER_PENDING", "Waiver pending"
        WAIVED = "WAIVED", "Waived"
        REJECTED = "REJECTED", "Rejected"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.OneToOneField(
        "cases.Case",
        on_delete=models.CASCADE,
        related_name="conflict_check",
    )
    firm = models.ForeignKey(
        "firm.LawFirm",
        on_delete=models.CASCADE,
        related_name="case_conflict_checks",
    )
    reference_number = models.CharField(max_length=40)
    status = models.CharField(max_length=40, choices=Status.choices, default=Status.NOT_STARTED)
    initiated_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    initiated_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="initiated_conflict_checks",
    )
    completed_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="completed_conflict_checks",
    )
    reviewed_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_conflict_checks",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_conflict_checks",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    search_scope = models.CharField(max_length=255, blank=True, default="")
    searched_names = models.JSONField(default=list, blank=True)
    searched_entities = models.JSONField(default=list, blank=True)
    result_summary = models.TextField(blank=True, default="")
    internal_notes = models.TextField(blank=True, default="")
    waiver_required = models.BooleanField(default=False)
    waiver_obtained = models.BooleanField(default=False)
    waiver_details = models.TextField(blank=True, default="")
    supporting_document = models.ForeignKey(
        "cases.CaseAttachment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="conflict_checks",
    )

    class Meta:
        db_table = "case_conflict_checks"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["case"],
                name="unique_conflict_check_per_case",
            ),
            models.UniqueConstraint(
                fields=["firm", "reference_number"],
                name="unique_conflict_reference_per_firm",
            ),
        ]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["reference_number"]),
        ]

    def __str__(self):
        return f"{self.reference_number} - {self.status}"
