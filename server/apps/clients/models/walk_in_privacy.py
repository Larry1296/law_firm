"""Step 1 configuration and delivery evidence; no client onboarding records."""
import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class WalkInPrivacyConfig(models.Model):
    firm = models.OneToOneField('firm.LawFirm', on_delete=models.PROTECT, related_name='intake_privacy')
    policy_version = models.CharField(max_length=80)
    lawful_basis = models.CharField(max_length=40, choices=[
        ('PRE_CONTRACT', 'Steps requested before a contract — section 30(1)(b)(i)'),
        ('LEGITIMATE_INTERESTS', 'Legitimate interests — section 30(1)(b)(vii)'),
    ])
    lawful_basis_explanation = models.TextField()
    mandatory_legal_requirement = models.TextField()
    recipients = models.TextField()
    retention = models.TextField()
    privacy_contact = models.TextField()
    transfers = models.TextField()
    safeguards = models.TextField()
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    approved_at = models.DateTimeField(default=timezone.now)


class WalkInNoticeDelivery(models.Model):
    class Method(models.TextChoices):
        SCREEN = 'SCREEN', 'Displayed to visitor'
        READ_ALOUD = 'READ_ALOUD', 'Read and explained to visitor'
        PAPER = 'PAPER', 'Printed notice provided to visitor'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey('firm.LawFirm', on_delete=models.PROTECT)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    version = models.CharField(max_length=120)
    snapshot = models.JSONField()
    method = models.CharField(max_length=20, choices=Method.choices)
    delivered_at = models.DateTimeField(default=timezone.now)
    acknowledged = models.BooleanField(default=True)
