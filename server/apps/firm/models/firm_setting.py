import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class FirmSetting(TimestampedModel):
    """
    Stores system-wide configuration for the law firm.

    This model controls how the application behaves,
    not the firm's business identity.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    firm = models.OneToOneField(
        "firm.LawFirm",
        on_delete=models.CASCADE,
        related_name="settings",
    )

    # ======================================================
    # Localization
    # ======================================================

    timezone = models.CharField(
        max_length=100,
        default="Africa/Nairobi",
    )

    language = models.CharField(
        max_length=50,
        default="English",
    )

    currency = models.CharField(
        max_length=10,
        default="KES",
    )

    # ======================================================
    # Working Schedule
    # ======================================================

    opening_time = models.TimeField(
        null=True,
        blank=True,
    )

    closing_time = models.TimeField(
        null=True,
        blank=True,
    )

    work_on_saturday = models.BooleanField(
        default=False,
    )

    work_on_sunday = models.BooleanField(
        default=False,
    )

    # ======================================================
    # Notifications
    # ======================================================

    email_notifications = models.BooleanField(
        default=True,
    )

    sms_notifications = models.BooleanField(
        default=False,
    )

    browser_notifications = models.BooleanField(
        default=True,
    )

    # ======================================================
    # Client Portal
    # ======================================================

    allow_client_registration = models.BooleanField(
        default=False,
    )

    allow_client_document_upload = models.BooleanField(
        default=True,
    )

    allow_client_case_tracking = models.BooleanField(
        default=True,
    )

    # ======================================================
    # Security
    # ======================================================

    require_password_change = models.BooleanField(
        default=True,
    )

    enable_two_factor_authentication = models.BooleanField(
        default=False,
    )

    session_timeout_minutes = models.PositiveIntegerField(
        default=60,
    )

    # ======================================================
    # AI Features
    # ======================================================

    enable_ai_assistant = models.BooleanField(
        default=True,
    )

    enable_ai_case_suggestions = models.BooleanField(
        default=True,
    )

    enable_ai_deadline_reminders = models.BooleanField(
        default=True,
    )

    # ======================================================
    # General
    # ======================================================

    is_active = models.BooleanField(
        default=True,
    )

    class Meta:
        db_table = "firm_settings"
        verbose_name = "Firm Setting"
        verbose_name_plural = "Firm Settings"

    def __str__(self):
        return f"{self.firm.name} Settings"