from django.db import models


class TrustClient(models.Model):

    client = models.OneToOneField(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="trust_profile"
    )

    trust_name = models.CharField(max_length=255)

    trust_type = models.CharField(max_length=100, null=True, blank=True)

    trust_deed_reference = models.CharField(max_length=100, null=True, blank=True)

    formation_date = models.DateField(null=True, blank=True)

    jurisdiction = models.CharField(max_length=100, null=True, blank=True)

    trustee_count = models.PositiveIntegerField(default=0)

    primary_trustee_name = models.CharField(max_length=255, null=True, blank=True)
    primary_trustee_contact = models.CharField(max_length=30, null=True, blank=True)

    beneficiary_details = models.TextField(null=True, blank=True)

    assets_under_trust = models.TextField(null=True, blank=True)

    legal_representative = models.CharField(max_length=255, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.trust_name