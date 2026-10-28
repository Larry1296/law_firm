import uuid
from django.conf import settings
from django.db import models
from apps.common.models.timestamped_model import TimestampedModel


class ClientVisit(TimestampedModel):
    class Status(models.TextChoices):
        WAITING = 'WAITING', 'Waiting'
        CALLED = 'CALLED', 'Ready to usher in'
        IN_CONSULTATION = 'IN_CONSULTATION', 'In consultation'
        COMPLETED = 'COMPLETED', 'Completed'
        LEFT = 'LEFT', 'Left'

    class Outcome(models.TextChoices):
        INSTRUCTING = 'INSTRUCTING', 'Instructing the firm — open a file'
        ENQUIRY_ONLY = 'ENQUIRY_ONLY', 'Enquiry only — no file'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey('firm.LawFirm', on_delete=models.PROTECT)
    visitor_name = models.CharField(max_length=255)
    # Reception's visitor register: the phone recognises a returning visitor.
    visitor_phone = models.CharField(max_length=20, blank=True, db_index=True)
    client = models.ForeignKey('clients.Client', null=True, blank=True, on_delete=models.PROTECT)
    advocate = models.ForeignKey('staff.Lawyer', on_delete=models.PROTECT)
    received_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    intake_handler = models.CharField(max_length=20, choices=[('RECEPTIONIST', 'Receptionist'), ('ADVOCATE', 'Advocate')])
    arrival_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.WAITING)
    urgency_flag = models.BooleanField(default=False)
    urgency_note = models.CharField(max_length=500, blank=True)
    contact_details = models.CharField(max_length=255, blank=True)
    acting_capacity = models.CharField(max_length=255, blank=True)
    other_parties = models.CharField(max_length=1000, blank=True)
    broad_issue = models.CharField(max_length=500, blank=True)
    deadline = models.DateField(null=True, blank=True)
    intake_completed_at = models.DateTimeField(null=True, blank=True)
    intake_completed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name='completed_visit_intakes')
    consultation_started_at = models.DateTimeField(null=True, blank=True)
    called_at = models.DateTimeField(null=True, blank=True)
    called_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name='called_client_visits')
    ushered_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name='ushered_client_visits')
    closed_at = models.DateTimeField(null=True, blank=True)
    # The advocate's direction at the end of the consultation; the secretary opens the file when instructing.
    outcome = models.CharField(max_length=20, choices=Outcome.choices, blank=True)

    class Meta:
        ordering = ['arrival_at', 'id']
        indexes = [models.Index(fields=['firm', 'advocate', 'status', 'arrival_at'])]
        constraints = [models.UniqueConstraint(fields=['advocate'], condition=models.Q(status__in=['CALLED', 'IN_CONSULTATION']), name='one_active_visit_per_advocate')]
