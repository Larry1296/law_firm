import uuid

from django.core.exceptions import ValidationError
from django.db import models

from apps.common.choices import ConflictCheckSourceCategory, ConflictCheckStatus
from apps.common.models.timestamped_model import TimestampedModel


class ClientMatterConflictReferenceSequence(models.Model):
    firm = models.OneToOneField(
        "firm.LawFirm",
        on_delete=models.CASCADE,
        related_name="client_matter_conflict_reference_sequence",
    )
    year = models.PositiveIntegerField()
    next_number = models.PositiveIntegerField(default=1)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "client_matter_conflict_reference_sequences"


class ClientMatterConflictCheck(TimestampedModel):
    class AcceptanceDecision(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ACCEPTED = "ACCEPTED", "Accepted"
        DECLINED = "DECLINED", "Declined"
        CLIENT_WITHDREW = "CLIENT_WITHDREW", "Client withdrew"

    class AcceptanceReasonCategory(models.TextChoices):
        CONFLICT_CONFIRMED = "CONFLICT_CONFIRMED", "Conflict confirmed"
        OUTSIDE_EXPERTISE = "OUTSIDE_EXPERTISE", "Outside firm expertise"
        CAPACITY_CONSTRAINT = "CAPACITY_CONSTRAINT", "Capacity constraint"
        COMMERCIAL_TERMS = "COMMERCIAL_TERMS", "Commercial terms not agreed"
        CLIENT_WITHDREW = "CLIENT_WITHDREW", "Client withdrew"
        CDD_RESTRICTED = "CDD_RESTRICTED", "CDD restricted"
        OTHER = "OTHER", "Other"

    class EngagementStatus(models.TextChoices):
        NOT_STARTED = "NOT_STARTED", "Not started"
        DRAFTING = "DRAFTING", "Drafting"
        SENT_TO_CLIENT = "SENT_TO_CLIENT", "Sent to client"
        SIGNED = "SIGNED", "Signed"
        FEE_ARRANGEMENT_CONFIRMED = "FEE_ARRANGEMENT_CONFIRMED", "Fee arrangement confirmed"
        WAIVED_OR_NOT_REQUIRED = "WAIVED_OR_NOT_REQUIRED", "Waived or not required"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(
        "firm.LawFirm",
        on_delete=models.CASCADE,
        related_name="client_matter_conflict_checks",
    )
    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.PROTECT,
        related_name="matter_conflict_checks",
    )
    reference_number = models.CharField(max_length=40)
    proposed_matter_title = models.CharField(max_length=255)
    proposed_instructions = models.TextField()
    factual_summary = models.TextField(blank=True, default="")
    desired_outcome = models.TextField(blank=True, default="")
    urgency_level = models.CharField(max_length=30, blank=True, default="")
    urgency_details = models.TextField(blank=True, default="")
    limitation_or_deadline_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=40,
        choices=ConflictCheckStatus.choices,
        default=ConflictCheckStatus.NOT_STARTED,
    )
    responsible_lawyer = models.ForeignKey(
        "staff.Lawyer",
        on_delete=models.PROTECT,
        related_name="responsible_conflict_checks",
    )
    review_assigned_to = models.ForeignKey(
        "staff.Lawyer",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="review_conflict_checks",
    )
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    names_checked = models.JSONField(default=list, blank=True)
    source_categories_checked = models.JSONField(default=list, blank=True)
    other_source_description = models.TextField(blank=True, default="")
    information_missing = models.TextField(blank=True, default="")
    first_reviewer_findings = models.TextField(blank=True, default="")
    result_summary = models.TextField(blank=True, default="")
    internal_reason = models.TextField(blank=True, default="")
    restricted_note = models.TextField(blank=True, default="")
    decision_confirmation = models.BooleanField(default=False)
    decided_by = models.ForeignKey(
        "staff.Lawyer",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="decided_conflict_checks",
    )
    decided_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_client_matter_conflict_checks",
    )
    created_case = models.OneToOneField(
        "cases.Case",
        on_delete=models.PROTECT,
        related_name="originating_conflict_check",
        null=True,
        blank=True,
    )
    consumed_at = models.DateTimeField(null=True, blank=True)
    no_adverse_party_currently_known = models.BooleanField(default=False)
    no_adverse_party_explanation = models.TextField(blank=True, default="")
    acceptance_decision = models.CharField(
        max_length=30,
        choices=AcceptanceDecision.choices,
        default=AcceptanceDecision.PENDING,
        db_index=True,
    )
    acceptance_reason_category = models.CharField(
        max_length=40,
        choices=AcceptanceReasonCategory.choices,
        blank=True,
        default="",
    )
    acceptance_internal_reason = models.TextField(blank=True, default="")
    scope_confirmation = models.TextField(blank=True, default="")
    engagement_status = models.CharField(
        max_length=40,
        choices=EngagementStatus.choices,
        default=EngagementStatus.NOT_STARTED,
    )
    accepted_by = models.ForeignKey(
        "staff.Lawyer",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="accepted_client_matter_conflict_checks",
    )
    accepted_at = models.DateTimeField(null=True, blank=True)
    acceptance_decided_by = models.ForeignKey(
        "staff.Lawyer",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="acceptance_decided_client_matter_conflict_checks",
    )
    acceptance_decided_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "client_matter_conflict_checks"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["firm", "reference_number"],
                name="unique_client_conflict_reference_per_firm",
            ),
        ]
        indexes = [
            models.Index(fields=["firm", "client", "status"]),
            models.Index(fields=["reference_number"]),
            models.Index(fields=["status"]),
        ]

    def clean(self):
        super().clean()
        if self.client_id and self.firm_id and self.client.firm_id != self.firm_id:
            raise ValidationError({"client": "Client must belong to the same firm as the conflict check."})
        for field_name in ["responsible_lawyer", "review_assigned_to", "decided_by", "accepted_by", "acceptance_decided_by"]:
            lawyer = getattr(self, field_name, None)
            if lawyer and lawyer.law_firm_id != self.firm_id:
                raise ValidationError({field_name: "Lawyer must belong to the same firm as the conflict check."})
        if self.created_case and (
            self.created_case.firm_id != self.firm_id or self.created_case.client_id != self.client_id
        ):
            raise ValidationError({"created_case": "Linked case must belong to this firm and client."})

    @property
    def is_consumed(self):
        return bool(self.created_case_id or self.consumed_at)

    @property
    def can_open_matter(self):
        return bool(
            self.status == ConflictCheckStatus.CLEARED
            and self.acceptance_decision == self.AcceptanceDecision.ACCEPTED
            and self.accepted_by_id
            and self.accepted_at
            and not self.is_consumed
        )

    def __str__(self):
        return f"{self.reference_number} - {self.proposed_matter_title}"


class ConflictCheckParty(TimestampedModel):
    class PartyType(models.TextChoices):
        PERSON = "PERSON", "Person"
        ORGANISATION = "ORGANISATION", "Organisation"

    class PartyRole(models.TextChoices):
        PROSPECTIVE_CLIENT = "PROSPECTIVE_CLIENT", "Prospective client"
        PROPOSED_ADVERSE_PARTY = "PROPOSED_ADVERSE_PARTY", "Proposed adverse party"
        CO_CLAIMANT = "CO_CLAIMANT", "Co-claimant"
        CO_RESPONDENT = "CO_RESPONDENT", "Co-respondent"
        INTERESTED_PARTY = "INTERESTED_PARTY", "Interested party"
        DIRECTOR = "DIRECTOR", "Director"
        SHAREHOLDER = "SHAREHOLDER", "Shareholder"
        BENEFICIAL_OWNER = "BENEFICIAL_OWNER", "Beneficial owner"
        GUARANTOR = "GUARANTOR", "Guarantor"
        WITNESS = "WITNESS", "Witness"
        RELATED_ENTITY = "RELATED_ENTITY", "Related entity"
        OTHER = "OTHER", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conflict_check = models.ForeignKey(
        ClientMatterConflictCheck,
        on_delete=models.CASCADE,
        related_name="parties",
    )
    name = models.CharField(max_length=255)
    party_type = models.CharField(max_length=20, choices=PartyType.choices)
    role = models.CharField(max_length=40, choices=PartyRole.choices)
    aliases = models.JSONField(default=list, blank=True)
    identification_reference = models.CharField(max_length=120, blank=True, default="")
    relationship_to_party = models.CharField(max_length=120, blank=True, default="")
    contact_information = models.TextField(blank=True, default="")
    internal_notes = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_conflict_check_parties",
    )

    class Meta:
        db_table = "client_matter_conflict_check_parties"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["role"]),
            models.Index(fields=["name"]),
        ]

    def __str__(self):
        return f"{self.name} - {self.role}"


class ConflictCheckHistory(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conflict_check = models.ForeignKey(
        ClientMatterConflictCheck,
        on_delete=models.CASCADE,
        related_name="history",
    )
    from_status = models.CharField(max_length=40, blank=True, default="")
    to_status = models.CharField(max_length=40, choices=ConflictCheckStatus.choices)
    action = models.CharField(max_length=60)
    summary = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    actor = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="client_matter_conflict_history_entries",
    )

    class Meta:
        db_table = "client_matter_conflict_check_history"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["to_status"]),
            models.Index(fields=["action"]),
        ]


class FirmAcceptanceHistory(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conflict_check = models.ForeignKey(
        ClientMatterConflictCheck,
        on_delete=models.CASCADE,
        related_name="acceptance_history",
    )
    from_decision = models.CharField(max_length=30, blank=True, default="")
    to_decision = models.CharField(max_length=30, choices=ClientMatterConflictCheck.AcceptanceDecision.choices)
    reason_category = models.CharField(max_length=40, blank=True, default="")
    internal_reason = models.TextField(blank=True, default="")
    scope_confirmation = models.TextField(blank=True, default="")
    engagement_status = models.CharField(max_length=40, blank=True, default="")
    actor = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="client_matter_acceptance_history_entries",
    )
    decided_by = models.ForeignKey(
        "staff.Lawyer",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="client_matter_acceptance_history_decisions",
    )
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "client_matter_firm_acceptance_history"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["to_decision"]),
            models.Index(fields=["reason_category"]),
        ]
