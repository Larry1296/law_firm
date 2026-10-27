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

    queue_reception_mode = models.CharField(
        max_length=20, default='SHARED',
        choices=[('SHARED', 'Shared reception — all advocates'), ('ASSIGNED', 'Secretaries handle their assigned advocates')],
    )

    # Whether every client and matter the firm has acted in is recorded here.
    # A firm that also keeps records elsewhere checks conflicts with a guided
    # checklist until its record of past checks is complete enough to search alone.
    conflict_records_scope = models.CharField(
        max_length=30, default='ALL_IN_SYSTEM',
        choices=[
            ('ALL_IN_SYSTEM', 'All our client and matter records are in this system'),
            ('INCLUDES_OUTSIDE_RECORDS', 'We also keep client and matter records outside this system'),
        ],
    )

    # Sends party names to the configured AI service to catch near-matches.
    conflict_ai_matching_enabled = models.BooleanField(default=False)

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

    require_signed_engagement_for_matter_opening = models.BooleanField(default=True)
    require_retainer_before_matter_opening = models.BooleanField(default=False)
    allow_engagement_waiver = models.BooleanField(default=True)
    require_independent_engagement_waiver_approval = models.BooleanField(default=True)

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
