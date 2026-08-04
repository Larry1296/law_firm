import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class LegalAssessment(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="legal_assessments")
    matter = models.ForeignKey("cases.Case", on_delete=models.PROTECT, related_name="legal_assessments")
    version = models.PositiveIntegerField()
    facts_understood = models.TextField()
    desired_outcome = models.TextField()
    parties_and_relationships = models.JSONField(default=list)
    legal_issues = models.JSONField(default=list)
    causes_or_defences = models.JSONField(default=list)
    evidence_available = models.JSONField(default=list)
    evidence_missing = models.JSONField(default=list)
    witnesses = models.JSONField(default=list)
    limitation_analysis = models.TextField()
    jurisdiction_analysis = models.TextField()
    procedural_route = models.TextField()
    available_remedies = models.JSONField(default=list)
    adr_options = models.JSONField(default=list)
    commercial_considerations = models.TextField(blank=True, default="")
    risks = models.JSONField(default=list)
    estimated_stages = models.JSONField(default=list)
    recommended_next_action = models.TextField()
    preliminary_generated_suggestions = models.JSONField(default=list, blank=True)
    suggestions_confirmed_by_advocate = models.BooleanField(default=False)
    client_advice_date = models.DateField(null=True, blank=True)
    advocate = models.ForeignKey("staff.Lawyer", on_delete=models.PROTECT, related_name="legal_assessments")
    supervisor = models.ForeignKey("staff.Lawyer", on_delete=models.PROTECT, null=True, blank=True, related_name="supervised_legal_assessments")
    client_decision = models.TextField(blank=True, default="")
    is_current = models.BooleanField(default=True)

    class Meta:
        db_table = "matter_legal_assessments"
        constraints = [
            models.UniqueConstraint(fields=["matter", "version"], name="unique_legal_assessment_version"),
            models.UniqueConstraint(fields=["matter"], condition=models.Q(is_current=True), name="one_current_legal_assessment"),
        ]


class MatterWorkstream(TimestampedModel):
    class Type(models.TextChoices):
        LITIGATION = "LITIGATION", "Litigation"
        TRANSACTIONAL = "TRANSACTIONAL", "Transactional / conveyancing"
        CRIMINAL = "CRIMINAL", "Criminal"
        PROBATE = "PROBATE", "Probate / succession"
        FAMILY = "FAMILY", "Family"
        EMPLOYMENT = "EMPLOYMENT", "Employment"
        TRIBUNAL = "TRIBUNAL", "Tribunal"
        ADR = "ADR", "Arbitration / mediation"
        REGULATORY = "REGULATORY", "Regulatory / administrative"
        ADVISORY = "ADVISORY", "Advisory / non-contentious"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="matter_workstreams")
    matter = models.OneToOneField("cases.Case", on_delete=models.PROTECT, related_name="workstream")
    workstream_type = models.CharField(max_length=24, choices=Type.choices)
    current_stage = models.CharField(max_length=80)
    stage_data = models.JSONField(default=dict)
    stage_history = models.JSONField(default=list)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="updated_matter_workstreams")

    class Meta:
        db_table = "matter_workstreams"


class MatterWorkstreamStage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workstream = models.ForeignKey(MatterWorkstream, on_delete=models.PROTECT, related_name="stage_records")
    sequence = models.PositiveIntegerField()
    stage = models.CharField(max_length=80)
    stage_data = models.JSONField(default=dict)
    checklist = models.JSONField(default=dict)
    supporting_documents = models.ManyToManyField("clients.ClientDocument", blank=True, related_name="workstream_stage_records")
    entered_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="entered_workstream_stages")
    entered_at = models.DateTimeField(auto_now_add=True)
    completed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="completed_workstream_stages")
    completed_at = models.DateTimeField(null=True, blank=True)
    completion_reason = models.TextField(blank=True, default="")

    class Meta:
        db_table = "matter_workstream_stages"
        ordering = ["sequence"]
        constraints = [models.UniqueConstraint(fields=["workstream", "sequence"], name="unique_workstream_stage_sequence")]

    def save(self, *args, **kwargs):
        if self.pk and type(self).objects.filter(pk=self.pk, completed_at__isnull=False).exists():
            raise ValidationError("Completed workstream stages are immutable.")
        return super().save(*args, **kwargs)


class MatterDeadline(TimestampedModel):
    class Type(models.TextChoices):
        LIMITATION = "LIMITATION", "Limitation"
        COURT = "COURT", "Court date"
        FILING = "FILING", "Filing"
        SERVICE = "SERVICE", "Service"
        RESPONSE = "RESPONSE", "Response"
        HEARING = "HEARING", "Hearing"
        MENTION = "MENTION", "Mention"
        SUBMISSIONS = "SUBMISSIONS", "Submissions"
        COMPLETION = "COMPLETION", "Completion"
        UNDERTAKING = "UNDERTAKING", "Undertaking"
        RENEWAL = "RENEWAL", "Renewal"
        APPEAL_REVIEW = "APPEAL_REVIEW", "Appeal / review"
        RETENTION_REVIEW = "RETENTION_REVIEW", "Retention review"
        CLIENT_FOLLOW_UP = "CLIENT_FOLLOW_UP", "Client follow-up"

    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="matter_deadlines")
    matter = models.ForeignKey("cases.Case", on_delete=models.PROTECT, related_name="deadlines")
    deadline_type = models.CharField(max_length=32, choices=Type.choices)
    due_at = models.DateTimeField()
    timezone = models.CharField(max_length=60, default="Africa/Nairobi")
    responsible_staff = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="responsible_deadlines")
    priority = models.CharField(max_length=16, choices=(("LOW", "Low"), ("MEDIUM", "Medium"), ("HIGH", "High"), ("CRITICAL", "Critical")))
    source = models.CharField(max_length=255)
    description = models.TextField()
    reminder_schedule = models.JSONField(default=list)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.OPEN)
    completed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="completed_deadlines")
    completed_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_deadlines")

    class Meta:
        db_table = "matter_deadlines"
        indexes = [models.Index(fields=["firm", "status", "due_at"])]


class DeadlineChangeHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    deadline = models.ForeignKey(MatterDeadline, on_delete=models.PROTECT, related_name="change_history")
    previous_due_at = models.DateTimeField()
    new_due_at = models.DateTimeField()
    reason = models.TextField()
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="deadline_changes")
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "matter_deadline_change_history"


class DeadlineStatusHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    deadline = models.ForeignKey(MatterDeadline, on_delete=models.PROTECT, related_name="status_history")
    previous_status = models.CharField(max_length=16)
    new_status = models.CharField(max_length=16)
    reason = models.TextField()
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="deadline_status_changes")
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "matter_deadline_status_history"


class MatterClosure(TimestampedModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PENDING_APPROVAL = "PENDING_APPROVAL", "Pending approval"
        CLOSED = "CLOSED", "Closed"
        REOPENED = "REOPENED", "Reopened"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="matter_closures")
    matter = models.ForeignKey("cases.Case", on_delete=models.PROTECT, related_name="closure_records")
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.DRAFT)
    proposed_closure_date = models.DateField()
    closure_reason = models.TextField()
    outcome = models.TextField()
    closing_summary = models.TextField()
    outstanding_actions = models.TextField(blank=True, default="")
    post_closure_responsibilities = models.TextField(blank=True, default="")
    appeal_position = models.TextField()
    enforcement_position = models.TextField()
    appeal_deadline = models.DateTimeField(null=True, blank=True)
    enforcement_review_date = models.DateField(null=True, blank=True)
    legal_work_complete = models.BooleanField(default=False)
    result_document_recorded = models.BooleanField(default=False)
    client_instructions_complete = models.BooleanField(default=False)
    undertakings_resolved = models.BooleanField(default=False)
    final_invoice_issued = models.BooleanField(default=False)
    final_client_account_prepared = models.BooleanField(default=False)
    closing_letter_prepared = models.BooleanField(default=False)
    client_informed = models.BooleanField(default=False)
    original_document_status = models.CharField(max_length=40, default="NOT_RECORDED")
    authorised_original_retention_reason = models.TextField(blank=True, default="")
    financial_clearance_status = models.CharField(max_length=40, default="NOT_RECORDED")
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="requested_matter_closures")
    responsible_advocate_approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="advocate_approved_closures")
    finance_approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="finance_approved_closures")
    administrative_approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="administratively_approved_closures")
    final_closure_date = models.DateTimeField(null=True, blank=True)
    reopening_reason = models.TextField(blank=True, default="")
    reopened_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="reopened_matters")
    reopened_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "matter_closures"
        constraints = [models.UniqueConstraint(fields=["matter"], condition=models.Q(status__in=["DRAFT", "PENDING_APPROVAL", "CLOSED"]), name="one_live_closure_per_matter")]


class GeneratedClosingDocument(models.Model):
    class Type(models.TextChoices):
        CLOSING_LETTER = "CLOSING_LETTER", "Closing letter"
        FINAL_CLIENT_STATEMENT = "FINAL_CLIENT_STATEMENT", "Final client statement"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="generated_closing_documents")
    matter = models.ForeignKey("cases.Case", on_delete=models.PROTECT, related_name="generated_closing_documents")
    closure = models.ForeignKey(MatterClosure, on_delete=models.PROTECT, related_name="generated_documents")
    document_type = models.CharField(max_length=32, choices=Type.choices)
    version = models.PositiveIntegerField()
    client_document = models.ForeignKey("clients.ClientDocument", on_delete=models.PROTECT, related_name="generated_closing_records")
    content_snapshot = models.JSONField(default=dict)
    generated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="generated_closing_documents")
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "generated_closing_documents"
        constraints = [models.UniqueConstraint(fields=["closure", "document_type", "version"], name="unique_closing_document_version")]


class MatterArchive(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="matter_archives")
    matter = models.OneToOneField("cases.Case", on_delete=models.PROTECT, related_name="archive")
    archive_reference = models.CharField(max_length=80)
    closure_date = models.DateField()
    archive_date = models.DateField()
    physical_location = models.CharField(max_length=255, blank=True, default="")
    electronic_location = models.CharField(max_length=255)
    archive_category = models.CharField(max_length=80)
    matter_type = models.CharField(max_length=80)
    retention_policy = models.TextField()
    retention_start_date = models.DateField()
    scheduled_review_date = models.DateField()
    proposed_destruction_date = models.DateField(null=True, blank=True)
    permanent_preservation = models.BooleanField(default=False)
    legal_hold = models.BooleanField(default=False)
    legal_hold_reason = models.TextField(blank=True, default="")
    legal_hold_authority = models.CharField(max_length=255, blank=True, default="")
    original_documents_held = models.BooleanField(default=False)
    data_sensitivity = models.CharField(max_length=40, default="CONFIDENTIAL")
    responsible_custodian = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="custodied_archives")
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="approved_archives")
    archive_checklist = models.JSONField(default=dict)
    access_restrictions = models.TextField(blank=True, default="")

    class Meta:
        db_table = "matter_archives"
        constraints = [models.UniqueConstraint(fields=["firm", "archive_reference"], name="unique_archive_reference_per_firm")]


class ArchiveAccessLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    archive = models.ForeignKey(MatterArchive, on_delete=models.PROTECT, related_name="access_history")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="archive_accesses")
    purpose = models.TextField()
    accessed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "archive_access_logs"


class RetentionReview(TimestampedModel):
    class Outcome(models.TextChoices):
        EXTEND = "EXTEND", "Extend retention"
        LEGAL_HOLD = "LEGAL_HOLD", "Place on legal hold"
        RETURN_ORIGINALS = "RETURN_ORIGINALS", "Return originals"
        PERMANENT_PRESERVATION = "PERMANENT_PRESERVATION", "Permanent preservation"
        APPROVE_DESTRUCTION = "APPROVE_DESTRUCTION", "Approve secure destruction"
        DEFER = "DEFER", "Defer"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    archive = models.ForeignKey(MatterArchive, on_delete=models.PROTECT, related_name="retention_reviews")
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="retention_reviews")
    assessment = models.JSONField(default=dict)
    outcome = models.CharField(max_length=32, choices=Outcome.choices)
    reason = models.TextField()
    next_review_date = models.DateField(null=True, blank=True)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="approved_retention_reviews")
    approved_at = models.DateTimeField()

    class Meta:
        db_table = "archive_retention_reviews"


class ImmutableDestructionQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise ValidationError("Destruction logs are immutable.")

    def delete(self):
        raise ValidationError("Destruction logs cannot be deleted.")


class DestructionLog(models.Model):
    objects = ImmutableDestructionQuerySet.as_manager()
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="destruction_logs")
    archive = models.OneToOneField(MatterArchive, on_delete=models.PROTECT, related_name="destruction_log")
    matter_reference = models.CharField(max_length=80)
    records_approved = models.JSONField(default=list)
    records_excluded = models.JSONField(default=list)
    approval_authority = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="authorised_destructions")
    approval_date = models.DateField()
    destruction_date = models.DateField()
    method = models.TextField()
    performed_by = models.CharField(max_length=255)
    verifier = models.CharField(max_length=255)
    certificate_reference = models.CharField(max_length=255, blank=True, default="")
    electronic_deletion_confirmed = models.BooleanField(default=False)
    backup_handling_decision = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "archive_destruction_logs"

    def save(self, *args, **kwargs):
        if self.pk and type(self).objects.filter(pk=self.pk).exists():
            raise ValidationError("Destruction logs are immutable.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Destruction logs cannot be deleted.")
