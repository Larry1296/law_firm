import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class CaseEvent(TimestampedModel):
    class EventType(models.TextChoices):
        MENTION = "MENTION", "Mention"
        HEARING = "HEARING", "Hearing"
        DIRECTIONS = "DIRECTIONS", "Directions"
        PRE_TRIAL = "PRE_TRIAL", "Pre-Trial Conference"
        MEDIATION = "MEDIATION", "Mediation"
        SUBMISSIONS = "SUBMISSIONS", "Submissions"
        RULING = "RULING", "Ruling"
        JUDGMENT = "JUDGMENT", "Judgment"
        TAXATION = "TAXATION", "Taxation"
        EXECUTION = "EXECUTION", "Execution"
        REGISTRY_ACTION = "REGISTRY_ACTION", "Registry Action"
        CLIENT_MEETING = "CLIENT_MEETING", "Client Meeting"
        OTHER = "OTHER", "Other"

    class EventStatus(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Scheduled"
        ADJOURNED = "ADJOURNED", "Adjourned"
        TAKEN_OUT = "TAKEN_OUT", "Taken Out"
        PROCEEDED = "PROCEEDED", "Proceeded"
        PART_HEARD = "PART_HEARD", "Part Heard"
        CONCLUDED = "CONCLUDED", "Concluded"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey("cases.Case", on_delete=models.CASCADE, related_name="events")
    event_type = models.CharField(max_length=40, choices=EventType.choices)
    status = models.CharField(max_length=30, choices=EventStatus.choices, default=EventStatus.SCHEDULED)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField(null=True, blank=True)
    court_station = models.CharField(max_length=255, blank=True, default="")
    courtroom = models.CharField(max_length=100, blank=True, default="")
    judicial_officer = models.CharField(max_length=255, blank=True, default="")
    cause_list_position = models.CharField(max_length=50, blank=True, default="")
    adjournment_reason = models.TextField(blank=True, default="")
    outcome = models.TextField(blank=True, default="")
    next_action = models.CharField(max_length=255, blank=True, default="")
    next_date = models.DateTimeField(null=True, blank=True)
    is_client_visible = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_case_events",
    )

    class Meta:
        db_table = "case_events"
        ordering = ["starts_at"]
        indexes = [
            models.Index(fields=["case", "starts_at"]),
            models.Index(fields=["event_type"]),
            models.Index(fields=["status"]),
            models.Index(fields=["is_client_visible"]),
        ]

    def __str__(self):
        return f"{self.case.case_number} - {self.title}"
