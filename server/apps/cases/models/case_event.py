import uuid

from django.db import models
from django.db.models import Max

from apps.common.choices import CourtEventOutcome, CourtEventType
from apps.common.models.timestamped_model import TimestampedModel


class CaseEvent(TimestampedModel):
    EventType = CourtEventType

    class EventStatus(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Scheduled"
        CONFIRMED = "CONFIRMED", "Confirmed"
        IN_PROGRESS = "IN_PROGRESS", "In progress"
        COMPLETED = "COMPLETED", "Completed"
        ADJOURNED = "ADJOURNED", "Adjourned"
        VACATED = "VACATED", "Vacated"
        MISSED = "MISSED", "Missed"
        TAKEN_OUT = "TAKEN_OUT", "Taken Out"
        PROCEEDED = "PROCEEDED", "Proceeded"
        PART_HEARD = "PART_HEARD", "Part Heard"
        CONCLUDED = "CONCLUDED", "Concluded"
        CANCELLED = "CANCELLED", "Cancelled"

    class HearingMode(models.TextChoices):
        VIRTUAL = "VIRTUAL", "Virtual"
        PHYSICAL = "PHYSICAL", "Physical"
        HYBRID = "HYBRID", "Hybrid"
        NOT_APPLICABLE = "NOT_APPLICABLE", "Not applicable"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey("cases.Case", on_delete=models.CASCADE, related_name="events")
    sequence_number = models.PositiveIntegerField(default=1)
    event_type = models.CharField(max_length=40, choices=EventType.choices)
    event_subtype = models.CharField(max_length=80, blank=True, default="")
    status = models.CharField(max_length=30, choices=EventStatus.choices, default=EventStatus.SCHEDULED)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField(null=True, blank=True)
    actual_start = models.DateTimeField(null=True, blank=True)
    actual_end = models.DateTimeField(null=True, blank=True)
    court_stage_before = models.CharField(max_length=50, blank=True, default="")
    court_stage_after = models.CharField(max_length=50, blank=True, default="")
    matter_status_before = models.CharField(max_length=50, blank=True, default="")
    matter_status_after = models.CharField(max_length=50, blank=True, default="")
    court = models.CharField(max_length=255, blank=True, default="")
    court_station = models.CharField(max_length=255, blank=True, default="")
    courtroom = models.CharField(max_length=100, blank=True, default="")
    hearing_mode = models.CharField(
        max_length=30,
        choices=HearingMode.choices,
        default=HearingMode.VIRTUAL,
    )
    virtual_meeting_url = models.URLField(max_length=1000, blank=True, default="")
    virtual_access_instructions = models.TextField(blank=True, default="")
    physical_venue = models.CharField(max_length=255, blank=True, default="")
    judicial_officer = models.CharField(max_length=255, blank=True, default="")
    virtual_courtroom_url = models.URLField(max_length=1000, blank=True, default="")
    virtual_courtroom_label = models.CharField(max_length=120, blank=True, default="")
    virtual_courtroom_available_from = models.DateTimeField(null=True, blank=True)
    virtual_courtroom_available_until = models.DateTimeField(null=True, blank=True)
    is_virtual_courtroom_enabled = models.BooleanField(default=False)
    cause_list_position = models.CharField(max_length=50, blank=True, default="")
    adjournment_reason = models.TextField(blank=True, default="")
    outcome = models.TextField(blank=True, default="")
    outcome_code = models.CharField(max_length=40, choices=CourtEventOutcome.choices, blank=True, default="")
    proceeded = models.BooleanField(null=True, blank=True)
    attendance = models.JSONField(default=list, blank=True)
    orders_directions = models.TextField(blank=True, default="")
    next_action = models.CharField(max_length=255, blank=True, default="")
    next_date = models.DateTimeField(null=True, blank=True)
    previous_event = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="created_next_events"
    )
    court_direction_details = models.TextField(blank=True, default="")
    cancelled_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_case_events",
    )
    cancellation_reason = models.TextField(blank=True, default="")
    is_client_visible = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_case_events",
    )
    recorded_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="recorded_case_proceedings",
    )
    verified_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="verified_case_proceedings",
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    supporting_documents = models.ManyToManyField(
        "cases.CaseAttachment", blank=True, related_name="supported_proceedings"
    )

    class Meta:
        db_table = "case_events"
        ordering = ["starts_at"]
        indexes = [
            models.Index(fields=["case", "starts_at"]),
            models.Index(fields=["event_type"]),
            models.Index(fields=["status"]),
            models.Index(fields=["is_client_visible"]),
            models.Index(fields=["is_virtual_courtroom_enabled", "starts_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["case", "sequence_number"],
                name="unique_case_event_sequence",
            ),
        ]

    def __str__(self):
        return f"{self.case.case_number} - {self.title}"

    def save(self, *args, **kwargs):
        # Keep direct ORM/admin creation backwards compatible. Transactional
        # proceedings creation still locks the case before allocating a number.
        if self._state.adding:
            current_max = (
                CaseEvent.objects.filter(case_id=self.case_id)
                .aggregate(Max("sequence_number"))["sequence_number__max"]
                or 0
            )
            if self.sequence_number <= current_max:
                self.sequence_number = current_max + 1
        super().save(*args, **kwargs)
