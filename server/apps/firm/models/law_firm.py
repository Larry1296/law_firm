import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class LawFirm(TimestampedModel):
    """
    A tenant of the platform: one subscribing law firm.

    Every firm-owned record is scoped to a LawFirm, and each firm has one
    FirmSubscription (apps.subscriptions). The LawFirm model stores the
    firm's identity and general business information.

    It does not store staff, clients, cases or
    operational data.
    """

    class BusinessStructure(models.TextChoices):
        SOLE_PRACTITIONER = "SOLE_PRACTITIONER", "Sole practitioner"
        PARTNERSHIP = "PARTNERSHIP", "Partnership"
        LLP = "LLP", "Limited liability partnership"

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

    business_structure = models.CharField(
        max_length=30,
        choices=BusinessStructure.choices,
        default=BusinessStructure.PARTNERSHIP,
        db_default=BusinessStructure.PARTNERSHIP,
    )

    county = models.CharField(
        max_length=60,
        blank=True,
        db_default="",
        help_text="County of the head office.",
    )

    town = models.CharField(
        max_length=100,
        blank=True,
        db_default="",
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

    def save(self, *args, **kwargs):
        # A newly uploaded logo is squared and resized so it always fills its tile.
        if self.logo and not getattr(self.logo, "_committed", True):
            from apps.firm.logo import normalize_logo

            self.logo = normalize_logo(self.logo)
        super().save(*args, **kwargs)