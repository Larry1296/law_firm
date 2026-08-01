import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class ProposedMatter(TimestampedModel):
    """A proposed matter that captures instructions before conflict checking.

    This is the very first stage of the matter lifecycle.  An advocate or
    authorised staff member records the proposed instructions, identifies the
    prospective client and any known adverse party, and flags urgency or
    limitation concerns.  Only after the proposed matter is saved does the
    formal conflict-check workflow begin.
    """

    class UrgencyLevel(models.TextChoices):
        LOW = "LOW", "Low"
        NORMAL = "NORMAL", "Normal"
        HIGH = "HIGH", "High"
        URGENT = "URGENT", "Urgent"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SUBMITTED = "SUBMITTED", "Submitted"
        CONFLICT_CHECK_INITIATED = "CONFLICT_CHECK_INITIATED", "Conflict check initiated"
        CONFLICT_CLEARED = "CONFLICT_CLEARED", "Conflict cleared"
        CONFLICT_IDENTIFIED = "CONFLICT_IDENTIFIED", "Conflict identified"
        CONVERTED_TO_MATTER = "CONVERTED_TO_MATTER", "Converted to matter"
        WITHDRAWN = "WITHDRAWN", "Withdrawn"
        ABANDONED = "ABANDONED", "Abandoned"

    # ── Identity & ownership ──────────────────────────────────────────
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(
        "firm.LawFirm",
        on_delete=models.CASCADE,
        related_name="proposed_matters",
    )
    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="proposed_matters",
    )
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_proposed_matters",
    )
    responsible_advocate = models.ForeignKey(
        "staff.Lawyer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="proposed_matters",
        help_text="The advocate who will handle the matter if it proceeds.",
    )

    # ── Instruction fields ────────────────────────────────────────────
    title = models.CharField(
        max_length=255,
        help_text="Short descriptive title for the proposed matter.",
    )
    proposed_instructions = models.TextField(
        help_text="The proposed instructions from the prospective client.",
    )
    factual_summary = models.TextField(
        blank=True,
        default="",
        help_text="Summary of the relevant facts as understood at proposal stage.",
    )
    desired_outcome = models.TextField(
        blank=True,
        default="",
        help_text="The outcome the prospective client hopes to achieve.",
    )

    # ── Urgency ───────────────────────────────────────────────────────
    urgency_level = models.CharField(
        max_length=20,
        choices=UrgencyLevel.choices,
        default=UrgencyLevel.NORMAL,
    )
    urgency_details = models.TextField(
        blank=True,
        default="",
        help_text="Free-text explanation of why the matter is urgent (if applicable).",
    )

    # ── Adverse party ─────────────────────────────────────────────────
    known_adverse_party = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Name of the known adverse / opposing party, if any.",
    )
    no_adverse_party_known = models.BooleanField(
        default=False,
        help_text="Tick when no adverse party is currently known.",
    )

    # ── Limitation / deadline ─────────────────────────────────────────
    limitation_date = models.DateField(
        null=True,
        blank=True,
        help_text="Statutory limitation or key deadline date.",
    )

    # ── Lifecycle ─────────────────────────────────────────────────────
    status = models.CharField(
        max_length=40,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    withdrawn_at = models.DateTimeField(null=True, blank=True)
    withdrawal_reason = models.TextField(blank=True, default="")
    converted_to_case = models.OneToOneField(
        "cases.Case",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="source_proposed_matter",
        help_text="The Case created when this proposed matter is converted.",
    )

    class Meta:
        db_table = "proposed_matters"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["firm", "status"]),
            models.Index(fields=["firm", "urgency_level"]),
            models.Index(fields=["client"]),
            models.Index(fields=["responsible_advocate"]),
        ]

    def __str__(self):
        return f"Proposed: {self.title} ({self.status})"
