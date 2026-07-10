import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from apps.common.choices import UserRole
from apps.common.models.timestamped_model import TimestampedModel
from apps.users.managers import UserManager


class User(AbstractBaseUser, PermissionsMixin, TimestampedModel):
    """
    System identity model.

    A User represents anyone who can authenticate into the system.

    System Roles:
        - ADMIN
        - STAFF
        - OFFICIAL_CLIENT
        - PORTAL_CLIENT

    Employment information is stored in the Staff model.
    Client information is stored in the Client model.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    email = models.EmailField(
        unique=True,
    )

    first_name = models.CharField(
        max_length=100,
    )

    last_name = models.CharField(
        max_length=100,
    )

    national_id_number = models.CharField(
        max_length=20,
        unique=True,
    )

    phone_number = models.CharField(
        max_length=20,
        unique=True,
    )

    role = models.CharField(
        max_length=30,
        choices=UserRole.choices,
        default=UserRole.PROSPECT,
    )

    must_change_password = models.BooleanField(
        default=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    is_staff = models.BooleanField(
        default=False,
    )

    objects = UserManager()

    USERNAME_FIELD = "email"

    REQUIRED_FIELDS = [
        "first_name",
        "last_name",
        "phone_number",
        "national_id_number",
    ]

    @property
    def full_name(self):
        name_parts = [
            part
            for part in [self.first_name, self.last_name]
            if part and part.strip() not in {"-"}
        ]
        return " ".join(name_parts).strip()

    @property
    def is_admin(self):
        return self.role == UserRole.ADMIN

    @property
    def is_staff_user(self):
        return self.role == UserRole.STAFF

    @property
    def is_official_client(self):
        return self.role == UserRole.OFFICIAL_CLIENT

    @property
    def is_portal_client(self):
        return self.role == UserRole.PROSPECT

    def __str__(self):
        return f"{self.full_name} ({self.email})"
