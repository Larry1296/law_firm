import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class Department(TimestampedModel):
    """
    Represents a department within a law firm.

    Departments are created by the firm during setup
    and are used to organize staff.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    firm = models.ForeignKey(
        "firm.LawFirm",
        on_delete=models.CASCADE,
        related_name="departments",
    )

    branch = models.ForeignKey(
        "firm.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="departments",
        help_text="Optional branch where this department belongs.",
    )

    name = models.CharField(
        max_length=150,
        help_text="Department name.",
    )

    description = models.TextField(
        blank=True,
    )

    head = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="headed_departments",
        help_text="Staff member responsible for this department.",
    )

    is_active = models.BooleanField(
        default=True,
    )

    class Meta:
        db_table = "firm_departments"
        verbose_name = "Department"
        verbose_name_plural = "Departments"
        ordering = ["name"]
        unique_together = ("firm", "name")

    def __str__(self):
        return self.name
