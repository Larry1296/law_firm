import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class Branch(TimestampedModel):
    """
    Represents a physical office of the law firm.

    A law firm may operate from one or more branches.
    Staff, clients, and cases may later be associated
    with a specific branch.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    firm = models.ForeignKey(
        "firm.LawFirm",
        on_delete=models.CASCADE,
        related_name="branches",
    )

    name = models.CharField(
        max_length=255,
        help_text="Branch name (e.g. Nairobi Head Office).",
    )

    code = models.CharField(
        max_length=20,
        blank=True,
        help_text="Optional unique branch code.",
    )

    email = models.EmailField(
        blank=True,
    )

    phone_number = models.CharField(
        max_length=30,
        blank=True,
    )

    physical_address = models.TextField(
        blank=True,
    )

    postal_address = models.CharField(
        max_length=255,
        blank=True,
    )

    branch_leader = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="led_branches",
        help_text="Staff member responsible for this branch. Defaults to the firm owner.",
    )

    is_head_office = models.BooleanField(
        default=False,
        help_text="Indicates whether this is the firm's main office.",
    )

    is_active = models.BooleanField(
        default=True,
    )

    class Meta:
        db_table = "firm_branches"
        verbose_name = "Branch"
        verbose_name_plural = "Branches"
        ordering = ["name"]
        unique_together = ("firm", "name")

    def __str__(self):
        return f"{self.firm.name} - {self.name}"
