import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class LawFirm(TimestampedModel):
    """
    Represents the law firm that owns this system.

    This platform is deployed for a single law firm.
    The LawFirm model stores the firm's identity and
    general business information.

    It does not store staff, clients, cases or
    operational data.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    name = models.CharField(
        max_length=255,
        unique=True,
        help_text="Registered name of the law firm.",
    )

    registration_number = models.CharField(
        max_length=100,
        unique=True,
        help_text="Official law firm registration number.",
    )

    kra_pin = models.CharField(
        max_length=20,
        blank=True,
        help_text="Kenya Revenue Authority PIN.",
    )

    email = models.EmailField(
        blank=True,
    )

    phone_number = models.CharField(
        max_length=30,
        blank=True,
    )

    website = models.URLField(
        blank=True,
    )

    physical_address = models.TextField(
        blank=True,
    )

    postal_address = models.CharField(
        max_length=255,
        blank=True,
    )

    logo = models.ImageField(
        upload_to="firms/logos/",
        blank=True,
        null=True,
    )

    description = models.TextField(
        blank=True,
    )

    owner = models.OneToOneField(
        "users.User",
        on_delete=models.PROTECT,
        related_name="owned_firm",
        help_text="Managing Partner and owner of the law firm.",
    )

    is_active = models.BooleanField(
        default=True,
    )

    class Meta:
        db_table = "law_firms"
        verbose_name = "Law Firm"
        verbose_name_plural = "Law Firms"

    def __str__(self):
        return self.name