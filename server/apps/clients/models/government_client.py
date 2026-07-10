from django.db import models


class GovernmentClient(models.Model):

    client = models.OneToOneField(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="government_profile"
    )

    government_entity_name = models.CharField(max_length=255)

    department = models.CharField(max_length=255, null=True, blank=True)

    agency_code = models.CharField(max_length=100, null=True, blank=True)

    registration_number = models.CharField(max_length=100, null=True, blank=True)

    jurisdiction_level = models.CharField(
        max_length=100,
        null=True,
        blank=True
    )

    contact_person_name = models.CharField(max_length=255, null=True, blank=True)
    contact_person_position = models.CharField(max_length=255, null=True, blank=True)
    contact_person_phone = models.CharField(max_length=30, null=True, blank=True)
    contact_person_email = models.EmailField(null=True, blank=True)

    office_address = models.TextField(null=True, blank=True)

    mandate_area = models.TextField(null=True, blank=True)

    legal_department_head = models.CharField(max_length=255, null=True, blank=True)
    legal_department_contact = models.CharField(max_length=30, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.government_entity_name