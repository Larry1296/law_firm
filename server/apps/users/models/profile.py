import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class Profile(TimestampedModel):
    """
    Additional user information that is not required for authentication.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    user = models.OneToOneField(
        "users.User",
        on_delete=models.CASCADE,
        related_name="profile",
    )

    profile_photo = models.ImageField(
        upload_to="profiles/",
        blank=True,
        null=True,
    )

    address = models.TextField(
        blank=True,
        null=True,
    )

    bio = models.TextField(
        blank=True,
        null=True,
    )

    def __str__(self):
        return f"Profile({self.user.email})"