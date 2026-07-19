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

    first_name = models.CharField(max_length=100, blank=True, default="")

    middle_name = models.CharField(max_length=100, blank=True, default="")

    last_name = models.CharField(max_length=100, blank=True, default="")

    preferred_name = models.CharField(max_length=100, blank=True, default="")

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

    employer = models.CharField(max_length=255, blank=True, default="")

    nationality = models.CharField(max_length=100, blank=True, default="Kenyan")

    citizenship = models.CharField(max_length=100, blank=True, default="Kenya")

    county_of_residence = models.CharField(max_length=100, blank=True, default="")

    physical_address = models.TextField(blank=True, default="")

    postal_address = models.TextField(blank=True, default="")

    preferred_language = models.CharField(max_length=50, blank=True, default="")

    preferred_contact_channel = models.CharField(max_length=20, blank=True, default="")

    disability_or_accessibility_notes = models.TextField(blank=True, default="")

    next_of_kin_name = models.CharField(max_length=255, blank=True, default="")

    next_of_kin_relationship = models.CharField(max_length=100, blank=True, default="")

    next_of_kin_phone = models.CharField(max_length=30, blank=True, default="")

    next_of_kin_email = models.EmailField(blank=True, default="")

    next_of_kin_national_id = models.CharField(max_length=50, blank=True, default="")

    next_of_kin_physical_address = models.TextField(blank=True, default="")

    identification_verified = models.BooleanField(default=False)

    identification_verified_at = models.DateTimeField(null=True, blank=True)

    identification_verified_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_individual_client_profiles",
    )

    notes = models.TextField(blank=True, default="")

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
