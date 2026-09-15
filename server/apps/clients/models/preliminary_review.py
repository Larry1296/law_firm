"""Minimum preliminary review, separate from reception and professional conflict decisions."""
import uuid
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from apps.audit_logs.models.audit_event import ImmutableAuditQuerySet


class PreliminaryReview(models.Model):
    class State(models.TextChoices):
        REVIEW = 'REVIEW', 'Awaiting preliminary review'
        INFORMATION = 'INFORMATION', 'Minimum information requested'
        AUTHORISED = 'AUTHORISED', 'Authorised for prospect/proposal creation'
        URGENT = 'URGENT', 'Urgent review required'
        CLOSED = 'CLOSED', 'Closed'
        CONVERTED = 'CONVERTED', 'Awaiting conflict screening'

    class Outcome(models.TextChoices):
        PROCEED_TO_CONFLICT_SCREENING = 'PROCEED_TO_CONFLICT_SCREENING', 'Proceed to conflict screening'
        REQUEST_MINIMUM_INFORMATION = 'REQUEST_MINIMUM_INFORMATION', 'Request minimum information'
        REFER_ELSEWHERE = 'REFER_ELSEWHERE', 'Refer elsewhere'
        DECLINE_AT_PRELIMINARY_STAGE = 'DECLINE_AT_PRELIMINARY_STAGE', 'Decline at preliminary stage'
        URGENT_REVIEW_REQUIRED = 'URGENT_REVIEW_REQUIRED', 'Urgent review required'

    class Execution(models.TextChoices):
        CREATE_NOW_BY_LAWYER = 'CREATE_NOW_BY_LAWYER', 'Create now by lawyer'
        ASSIGN_CREATION_TO_SECRETARY = 'ASSIGN_CREATION_TO_SECRETARY', 'Assign creation to secretary'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enquiry = models.OneToOneField('clients.WalkInEnquiry', on_delete=models.PROTECT, related_name='preliminary_review')
    lawyer = models.ForeignKey('staff.Lawyer', on_delete=models.PROTECT, related_name='preliminary_reviews')
    assigned_by = models.ForeignKey('users.User', on_delete=models.PROTECT, related_name='+')
    assigned_at = models.DateTimeField(default=timezone.now)
    state = models.CharField(max_length=20, choices=State.choices, default=State.REVIEW)
    revision = models.PositiveIntegerField(default=0)
    prospective_name = models.CharField(max_length=255)
    entity_kind = models.CharField(max_length=20, choices=[('PERSON', 'Person'), ('ORGANISATION', 'Organisation')])
    visitor_capacity = models.CharField(max_length=255, blank=True)
    service_category = models.CharField(max_length=100)
    working_title = models.CharField(max_length=255, blank=True)
    adverse_parties = models.JSONField(default=list)
    related_parties = models.JSONField(default=list)
    forum = models.CharField(max_length=255, blank=True)
    urgency = models.CharField(max_length=30, default='NONE')
    critical_date = models.DateField(null=True, blank=True)
    preliminary_note = models.CharField(max_length=500, blank=True)
    outcome = models.CharField(max_length=40, choices=Outcome.choices, blank=True)
    decision_reason = models.CharField(max_length=500, blank=True)
    decided_by = models.ForeignKey('staff.Lawyer', on_delete=models.PROTECT, null=True, blank=True, related_name='+')
    decided_at = models.DateTimeField(null=True, blank=True)
    execution = models.CharField(max_length=40, choices=Execution.choices, blank=True)
    secretary = models.ForeignKey('staff.Secretary', on_delete=models.PROTECT, null=True, blank=True, related_name='preliminary_reviews')
    missing_fields = models.JSONField(default=list)
    client = models.ForeignKey('clients.Client', on_delete=models.PROTECT, null=True, blank=True, related_name='originating_preliminary_reviews')
    proposed_matter = models.OneToOneField('clients.ClientMatterConflictCheck', on_delete=models.PROTECT, null=True, blank=True, related_name='preliminary_review')
    converted_by = models.ForeignKey('users.User', on_delete=models.PROTECT, null=True, blank=True, related_name='+')
    converted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [models.CheckConstraint(condition=(models.Q(client__isnull=True, proposed_matter__isnull=True) | models.Q(client__isnull=False, proposed_matter__isnull=False)), name='preliminary_conversion_links_together')]


class PreliminaryReviewHistory(models.Model):
    """Restricted immutable snapshots. Free text never goes into task or audit metadata."""
    objects = ImmutableAuditQuerySet.as_manager()
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    review = models.ForeignKey(PreliminaryReview, on_delete=models.PROTECT, related_name='history')
    actor = models.ForeignKey('users.User', on_delete=models.PROTECT)
    recorded_at = models.DateTimeField(default=timezone.now, editable=False)
    revision = models.PositiveIntegerField()
    action = models.CharField(max_length=40)
    reason = models.CharField(max_length=500, blank=True)
    snapshot = models.JSONField()

    class Meta:
        ordering = ['revision']
        constraints = [models.UniqueConstraint(fields=['review', 'revision'], name='unique_preliminary_history_revision')]

    def save(self, *args, **kwargs):
        if type(self).objects.filter(pk=self.pk).exists():
            raise ValidationError('Preliminary history is immutable.')
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError('Preliminary history is immutable.')


class PreliminaryPhysicalFile(models.Model):
    LABEL = 'PROSPECTIVE — CONFLICT/ACCEPTANCE PENDING'
    review = models.OneToOneField(PreliminaryReview, on_delete=models.PROTECT, related_name='physical_file')
    reference = models.CharField(max_length=80)
    opened_date = models.DateField()
    opened_by = models.ForeignKey('users.User', on_delete=models.PROTECT, related_name='+')
    location = models.CharField(max_length=255)
    custody_holder = models.ForeignKey('users.User', on_delete=models.PROTECT, related_name='+')
    # Movement snapshots are held in the review's immutable history.
