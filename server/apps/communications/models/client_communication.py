import uuid

from django.conf import settings
from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class ClientCommunication(TimestampedModel):
    class Channel(models.TextChoices):
        IN_PERSON = "IN_PERSON", "In-person meeting"
        TELEPHONE = "TELEPHONE", "Telephone"
        EMAIL = "EMAIL", "Email"
        WHATSAPP = "WHATSAPP", "WhatsApp"
        CLIENT_PORTAL = "CLIENT_PORTAL", "Client portal"
        LETTER = "LETTER", "Letter"
        VIDEO = "VIDEO", "Video meeting"
        COURT_ATTENDANCE = "COURT_ATTENDANCE", "Court attendance"
        OTHER = "OTHER", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="client_communications")
    matter = models.ForeignKey("cases.Case", on_delete=models.PROTECT, related_name="client_communications")
    client = models.ForeignKey("clients.Client", on_delete=models.PROTECT, related_name="communications")
    communication_type = models.CharField(max_length=80)
    occurred_at = models.DateTimeField()
    participants = models.JSONField(default=list)
    direction = models.CharField(max_length=16, choices=(("INCOMING", "Incoming"), ("OUTGOING", "Outgoing")))
    channel = models.CharField(max_length=24, choices=Channel.choices)
    subject = models.CharField(max_length=255)
    summary = models.TextField()
    advice_given = models.TextField(blank=True, default="")
    instructions_received = models.TextField(blank=True, default="")
    instructions_confirmed_in_writing = models.BooleanField(default=False)
    follow_up_required = models.BooleanField(default=False)
    follow_up_deadline = models.DateTimeField(null=True, blank=True)
    responsible_staff = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="responsible_client_communications")
    linked_documents = models.ManyToManyField("clients.ClientDocument", blank=True, related_name="linked_communications")
    confidentiality_level = models.CharField(max_length=32, default="CONFIDENTIAL")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_client_communications")

    class Meta:
        db_table = "client_communication_records"


class CommunicationAmendment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    communication = models.ForeignKey(ClientCommunication, on_delete=models.PROTECT, related_name="amendments")
    previous_values = models.JSONField(default=dict)
    new_values = models.JSONField(default=dict)
    reason = models.TextField()
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="communication_amendments")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "client_communication_amendments"
