from django.conf import settings
from django.db import models


class CompanyClient(models.Model):
    """
    Company-specific profile information.
    """

    class CompanyStatus(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        DORMANT = "DORMANT", "Dormant"
        UNDER_ADMINISTRATION = "UNDER_ADMINISTRATION", "Under Administration"
        INSOLVENT = "INSOLVENT", "Insolvent"
        DISSOLVED = "DISSOLVED", "Dissolved"
        OTHER = "OTHER", "Other"

    client = models.OneToOneField(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="company_profile",
    )

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="company_profile",
    )

    company_name = models.CharField(
        max_length=255,
    )

    registration_number = models.CharField(
        max_length=100,
        unique=True,
    )

    incorporation_date = models.DateField(
        null=True,
        blank=True,
    )

    country_of_incorporation = models.CharField(
        max_length=100,
        blank=True,
    )

    industry = models.CharField(
        max_length=100,
        blank=True,
    )

    company_status = models.CharField(
        max_length=50,
        choices=CompanyStatus.choices,
        default=CompanyStatus.ACTIVE,
    )

    director_count = models.PositiveIntegerField(
        default=0,
    )

    class Meta:
        db_table = "company_clients"
        verbose_name = "Company Client"
        verbose_name_plural = "Company Clients"
        indexes = [
            models.Index(fields=["registration_number"]),
            models.Index(fields=["company_status"]),
            models.Index(fields=["industry"]),
        ]

    def __str__(self):
        return self.company_name