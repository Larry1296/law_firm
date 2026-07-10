import uuid

from django.db import models
from apps.common.models.timestamped_model import TimestampedModel
from apps.common.choices import FirmRole


class LawFirmMember(TimestampedModel):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    firm = models.ForeignKey(
        "firm.LawFirm",
        on_delete=models.CASCADE,
        related_name="members",
    )

    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="firm_memberships",
    )

    role = models.CharField(
        max_length=30,
        choices=FirmRole.choices,
    )

    is_active = models.BooleanField(default=True)

    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_firm_members",
    )

    class Meta:
        db_table = "firm_members"
        ordering = ["-created_at"]
        unique_together = ("firm", "user")

    def __str__(self):
        return f"{self.user.full_name} - {self.role}"