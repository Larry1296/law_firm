from django.db import models


class IndividualClient(models.Model):

    class Gender(models.TextChoices):
        MALE = "MALE", "Male"
        FEMALE = "FEMALE", "Female"
        OTHER = "OTHER", "Other"

    class MaritalStatus(models.TextChoices):
        SINGLE = "SINGLE", "Single"
        MARRIED = "MARRIED", "Married"
        DIVORCED = "DIVORCED", "Divorced"
        WIDOWED = "WIDOWED", "Widowed"

    client = models.OneToOneField(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="individual_profile",
    )

    gender = models.CharField(
        max_length=20,
        choices=Gender.choices,
        null=True,
        blank=True,
    )

    occupation = models.CharField(
        max_length=255,
        null=True,
        blank=True,
    )

    marital_status = models.CharField(
        max_length=20,
        choices=MaritalStatus.choices,
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        db_table = "individual_clients"
        verbose_name = "Individual Client"
        verbose_name_plural = "Individual Clients"

    def __str__(self):
        return self.client.full_name