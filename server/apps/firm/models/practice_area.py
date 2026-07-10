import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class PracticeArea(TimestampedModel):
    """
    Represents a legal practice area offered by the law firm.

    Practice areas are created by the firm during
    the initial setup and can be managed later.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    firm = models.ForeignKey(
        "firm.LawFirm",
        on_delete=models.CASCADE,
        related_name="practice_areas",
    )

    name = models.CharField(
        max_length=150,
        help_text="Name of the legal practice area.",
    )

    description = models.TextField(
        blank=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    class Meta:
        db_table = "practice_areas"
        verbose_name = "Practice Area"
        verbose_name_plural = "Practice Areas"
        ordering = ["name"]
        unique_together = ("firm", "name")

    def __str__(self):
        return self.name