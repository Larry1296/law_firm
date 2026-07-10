from django.db import models


class PartnershipClient(models.Model):
    class AgreementType(models.TextChoices):
        GENERAL_PARTNERSHIP = "GENERAL_PARTNERSHIP", "General Partnership Agreement"
        LIMITED_PARTNERSHIP = "LIMITED_PARTNERSHIP", "Limited Partnership Agreement"
        LIMITED_LIABILITY_PARTNERSHIP = (
            "LIMITED_LIABILITY_PARTNERSHIP",
            "Limited Liability Partnership Agreement",
        )
        JOINT_VENTURE = "JOINT_VENTURE", "Joint Venture Agreement"
        SILENT_PARTNERSHIP = "SILENT_PARTNERSHIP", "Silent Partnership Agreement"
        STRATEGIC_ALLIANCE = "STRATEGIC_ALLIANCE", "Strategic Alliance Agreement"
        PROFIT_SHARING = "PROFIT_SHARING", "Profit Sharing Agreement"
        MEMORANDUM_OF_UNDERSTANDING = (
            "MEMORANDUM_OF_UNDERSTANDING",
            "Memorandum of Understanding",
        )

    client = models.OneToOneField(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="partnership_profile"
    )

    # --------------------------------
    # Partnership Identity
    # --------------------------------

    partnership_name = models.CharField(
        max_length=255
    )

    registration_number = models.CharField(
        max_length=100,
        null=True,
        blank=True
    )

    tax_pin = models.CharField(
        max_length=100,
        null=True,
        blank=True
    )

    formation_date = models.DateField(
        null=True,
        blank=True
    )

    # --------------------------------
    # Partnership Structure
    # --------------------------------

    partner_count = models.PositiveIntegerField(
        default=0
    )

    agreement_type = models.CharField(
        max_length=100,
        choices=AgreementType.choices,
        null=True,
        blank=True
    )

    # --------------------------------
    # Metadata
    # --------------------------------

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        db_table = "partnership_clients"

    def __str__(self):
        return self.partnership_name
