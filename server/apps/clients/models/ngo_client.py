from django.db import models


class NGOClient(models.Model):

    client = models.OneToOneField(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="ngo_profile"
    )

    ngo_name = models.CharField(max_length=255)

    registration_number = models.CharField(max_length=100)
    tax_pin = models.CharField(max_length=100, null=True, blank=True)

    registration_authority = models.CharField(max_length=255, null=True, blank=True)
    registration_date = models.DateField(null=True, blank=True)

    sector = models.CharField(max_length=100, null=True, blank=True)

    headquarters_address = models.TextField(null=True, blank=True)

    operational_regions = models.TextField(null=True, blank=True)

    director_name = models.CharField(max_length=255, null=True, blank=True)
    director_contact = models.CharField(max_length=30, null=True, blank=True)

    funding_sources = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.ngo_name