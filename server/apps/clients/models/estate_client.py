from django.db import models


class EstateClient(models.Model):

    client = models.OneToOneField(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="estate_profile"
    )

    estate_name = models.CharField(max_length=255)

    deceased_full_name = models.CharField(max_length=255)

    deceased_id_number = models.CharField(max_length=50, null=True, blank=True)

    date_of_death = models.DateField(null=True, blank=True)

    probate_number = models.CharField(max_length=100, null=True, blank=True)

    court_reference = models.CharField(max_length=100, null=True, blank=True)

    executor_name = models.CharField(max_length=255, null=True, blank=True)
    executor_contact = models.CharField(max_length=30, null=True, blank=True)

    administrator_name = models.CharField(max_length=255, null=True, blank=True)
    administrator_contact = models.CharField(max_length=30, null=True, blank=True)

    estate_value_estimate = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True
    )

    beneficiaries = models.TextField(null=True, blank=True)

    assets_description = models.TextField(null=True, blank=True)

    liabilities_description = models.TextField(null=True, blank=True)

    court_status = models.CharField(max_length=100, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.estate_name