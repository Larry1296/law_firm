from django.db import models

from apps.common.models.timestamped_model import TimestampedModel
from .client import Client


class ContactType(models.TextChoices):
    PRIMARY = "PRIMARY", "Primary Contact"
    SECONDARY = "SECONDARY", "Secondary Contact"
    EMERGENCY = "EMERGENCY", "Emergency Contact"
    BILLING = "BILLING", "Billing Contact"
    LEGAL_REPRESENTATIVE = "LEGAL_REPRESENTATIVE", "Legal Representative"
    OTHER = "OTHER", "Other"


class CommunicationChannel(models.TextChoices):
    PHONE = "PHONE", "Phone"
    EMAIL = "EMAIL", "Email"
    SMS = "SMS", "SMS"
    WHATSAPP = "WHATSAPP", "WhatsApp"
    OTHER = "OTHER", "Other"


class ClientContact(TimestampedModel):

    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="contacts",
    )

    contact_type = models.CharField(
        max_length=50,
        choices=ContactType.choices,
        default=ContactType.PRIMARY,
    )

    full_name = models.CharField(
        max_length=255,
        blank=True,
    )

    role_or_designation = models.CharField(
        max_length=255,
        blank=True,
        help_text="e.g. Director, Advocate, Executor, CEO",
    )

    national_id_number = models.CharField(
        max_length=50,
        blank=True,
    )

    email = models.EmailField(
        blank=True,
    )

    phone_number = models.CharField(
        max_length=30,
    )

    alternative_phone_number = models.CharField(
        max_length=30,
        blank=True,
    )

    preferred_channel = models.CharField(
        max_length=20,
        choices=CommunicationChannel.choices,
        default=CommunicationChannel.PHONE,
    )

    is_primary = models.BooleanField(
        default=False,
    )

    is_verified = models.BooleanField(
        default=False,
    )

    notes = models.TextField(
        blank=True,
    )

    class Meta:
        db_table = "client_contacts"
        verbose_name = "Client Contact"
        verbose_name_plural = "Client Contacts"
        indexes = [
            models.Index(fields=["client", "contact_type"]),
            models.Index(fields=["phone_number"]),
            models.Index(fields=["email"]),
        ]

    def __str__(self):
        return f"{self.full_name or self.phone_number}"
