import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class CourtroomProvider(TimestampedModel):
    class ProviderType(models.TextChoices):
        JUDICIARY = "JUDICIARY", "Kenya Judiciary"
        ZOOM = "ZOOM", "Zoom"
        TEAMS = "TEAMS", "Microsoft Teams"
        GOOGLE_MEET = "GOOGLE_MEET", "Google Meet"
        WEBEX = "WEBEX", "Webex"
        OTHER = "OTHER", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.CASCADE, related_name="courtroom_providers")
    name = models.CharField(max_length=120)
    provider_type = models.CharField(max_length=30, choices=ProviderType.choices, default=ProviderType.JUDICIARY)
    base_url = models.URLField(max_length=1000, blank=True, default="")
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_courtroom_providers",
    )

    class Meta:
        db_table = "courtroom_providers"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["firm", "name"], name="unique_courtroom_provider_per_firm"),
        ]
        indexes = [
            models.Index(fields=["firm", "is_active"]),
            models.Index(fields=["firm", "is_default"]),
        ]

    def __str__(self):
        return self.name


class CourtroomSession(TimestampedModel):
    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Scheduled"
        WAITING = "WAITING", "Waiting"
        LIVE = "LIVE", "Live"
        PAUSED = "PAUSED", "Paused"
        ENDED = "ENDED", "Ended"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.OneToOneField("cases.CaseEvent", on_delete=models.CASCADE, related_name="courtroom_session")
    provider = models.ForeignKey(
        CourtroomProvider,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sessions",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED)
    join_url = models.URLField(max_length=1000)
    host_url = models.URLField(max_length=1000, blank=True, default="")
    provider_meeting_id = models.CharField(max_length=120, blank=True, default="")
    passcode = models.CharField(max_length=120, blank=True, default="")
    live_started_at = models.DateTimeField(null=True, blank=True)
    live_ended_at = models.DateTimeField(null=True, blank=True)
    allow_recording_downloads = models.BooleanField(default=False)
    last_provider_sync_at = models.DateTimeField(null=True, blank=True)
    provider_payload = models.JSONField(default=dict, blank=True)
    notes = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_courtroom_sessions",
    )

    class Meta:
        db_table = "courtroom_sessions"
        ordering = ["event__starts_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["provider"]),
        ]

    def __str__(self):
        return f"{self.event.title} - {self.status}"


class CourtroomAttendanceLog(TimestampedModel):
    class AttendanceRole(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        LAWYER = "LAWYER", "Lawyer"
        SECRETARY = "SECRETARY", "Secretary"
        CLIENT = "CLIENT", "Client"
        GUEST = "GUEST", "Guest"

    class AttendanceStatus(models.TextChoices):
        INVITED = "INVITED", "Invited"
        CHECKED_IN = "CHECKED_IN", "Checked In"
        JOINED = "JOINED", "Joined"
        LEFT = "LEFT", "Left"
        MISSED = "MISSED", "Missed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(CourtroomSession, on_delete=models.CASCADE, related_name="attendance_logs")
    user = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="courtroom_attendance_logs",
    )
    attendee_name = models.CharField(max_length=255)
    attendee_email = models.EmailField(blank=True, default="")
    attendee_role = models.CharField(max_length=20, choices=AttendanceRole.choices, default=AttendanceRole.GUEST)
    status = models.CharField(max_length=20, choices=AttendanceStatus.choices, default=AttendanceStatus.INVITED)
    joined_at = models.DateTimeField(null=True, blank=True)
    left_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default="")
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "courtroom_attendance_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["session", "status"]),
            models.Index(fields=["user"]),
            models.Index(fields=["attendee_role"]),
        ]

    def __str__(self):
        return f"{self.attendee_name} - {self.status}"


class CourtroomCauseListSync(TimestampedModel):
    class SyncStatus(models.TextChoices):
        QUEUED = "QUEUED", "Queued"
        RUNNING = "RUNNING", "Running"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"
        PARTIAL = "PARTIAL", "Partial"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.CASCADE, related_name="courtroom_cause_list_syncs")
    provider = models.ForeignKey(
        CourtroomProvider,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cause_list_syncs",
    )
    source_name = models.CharField(max_length=160, blank=True, default="")
    source_url = models.URLField(max_length=1000, blank=True, default="")
    court_station = models.CharField(max_length=255, blank=True, default="")
    cause_list_date = models.DateField()
    status = models.CharField(max_length=20, choices=SyncStatus.choices, default=SyncStatus.QUEUED)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    total_items = models.PositiveIntegerField(default=0)
    matched_events = models.PositiveIntegerField(default=0)
    created_events = models.PositiveIntegerField(default=0)
    error_message = models.TextField(blank=True, default="")
    raw_payload = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_courtroom_cause_list_syncs",
    )

    class Meta:
        db_table = "courtroom_cause_list_syncs"
        ordering = ["-cause_list_date", "-created_at"]
        indexes = [
            models.Index(fields=["firm", "cause_list_date"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.court_station or self.source_name} - {self.cause_list_date}"


class CourtroomRecording(TimestampedModel):
    class RecordingStatus(models.TextChoices):
        REQUESTED = "REQUESTED", "Requested"
        PROCESSING = "PROCESSING", "Processing"
        READY = "READY", "Ready"
        FAILED = "FAILED", "Failed"
        EXPIRED = "EXPIRED", "Expired"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(CourtroomSession, on_delete=models.CASCADE, related_name="recordings")
    title = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=RecordingStatus.choices, default=RecordingStatus.READY)
    recording_url = models.URLField(max_length=1000, blank=True, default="")
    download_url = models.URLField(max_length=1000, blank=True, default="")
    file = models.FileField(upload_to="courtroom/recordings/", null=True, blank=True)
    recorded_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    file_size_bytes = models.PositiveBigIntegerField(default=0)
    is_downloadable = models.BooleanField(default=True)
    notes = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_courtroom_recordings",
    )

    class Meta:
        db_table = "courtroom_recordings"
        ordering = ["-recorded_at", "-created_at"]
        indexes = [
            models.Index(fields=["session", "status"]),
            models.Index(fields=["is_downloadable"]),
        ]

    def __str__(self):
        return self.title
