import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class CourtroomProvider(TimestampedModel):
    class ProviderType(models.TextChoices):
        JUDICIARY_PORTAL = "JUDICIARY_PORTAL", "Judiciary Portal"
        MICROSOFT_TEAMS = "MICROSOFT_TEAMS", "Microsoft Teams"
        ZOOM = "ZOOM", "Zoom"
        GOOGLE_MEET = "GOOGLE_MEET", "Google Meet"
        WEBEX = "WEBEX", "Webex"
        YOUTUBE_LIVE = "YOUTUBE_LIVE", "YouTube Live"
        OTHER = "OTHER", "Other"
        JUDICIARY = "JUDICIARY", "Kenya Judiciary (legacy)"
        TEAMS = "TEAMS", "Microsoft Teams (legacy)"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.CASCADE, related_name="courtroom_providers")
    name = models.CharField(max_length=120)
    provider_type = models.CharField(max_length=30, choices=ProviderType.choices, default=ProviderType.OTHER)
    base_url = models.URLField(max_length=1000, blank=True, default="")
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    supports_desktop_web = models.BooleanField(default=True)
    requires_mobile_app = models.BooleanField(default=False)
    allowed_hostnames = models.JSONField(default=list, blank=True)
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
        PREPARING = "PREPARING", "Preparing"
        READY_TO_JOIN = "READY_TO_JOIN", "Ready to join"
        WAITING_ROOM = "WAITING_ROOM", "Waiting room"
        COURT_IN_SESSION = "COURT_IN_SESSION", "Court in session"
        MATTER_NOT_CALLED = "MATTER_NOT_CALLED", "Matter not called"
        POSSIBLE_MATTER_CALL = "POSSIBLE_MATTER_CALL", "Possible matter call"
        MATTER_CALLED = "MATTER_CALLED", "Matter called"
        STOOD_DOWN = "STOOD_DOWN", "Stood down"
        PASSED_OVER = "PASSED_OVER", "Passed over"
        ADJOURNED = "ADJOURNED", "Adjourned"
        DIRECTIONS_ISSUED = "DIRECTIONS_ISSUED", "Directions issued"
        RULING_DELIVERED = "RULING_DELIVERED", "Ruling delivered"
        COMPLETED = "COMPLETED", "Completed"
        LINK_FAILED = "LINK_FAILED", "Link failed"
        REGISTRY_CONTACTED = "REGISTRY_CONTACTED", "Registry contacted"
        CANCELLED = "CANCELLED", "Cancelled"
        WAITING = "WAITING", "Waiting (legacy)"
        LIVE = "LIVE", "Live (legacy)"
        PAUSED = "PAUSED", "Paused (legacy)"
        ENDED = "ENDED", "Ended (legacy)"

    class ClientAttendance(models.TextChoices):
        NOT_REQUIRED = "NOT_REQUIRED", "Not required"
        OPTIONAL = "OPTIONAL", "Optional"
        REQUIRED = "REQUIRED", "Required"
        RESTRICTED = "RESTRICTED", "Restricted"
        TO_BE_CONFIRMED = "TO_BE_CONFIRMED", "To be confirmed"

    class LinkSource(models.TextChoices):
        CAUSE_LIST = "CAUSE_LIST", "Cause list"
        REGISTRY_EMAIL = "REGISTRY_EMAIL", "Registry email"
        JUDICIARY_WEBSITE = "JUDICIARY_WEBSITE", "Judiciary website"
        OFFICIAL_COMMUNICATION = "OFFICIAL_COMMUNICATION", "Other official communication"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.OneToOneField("cases.CaseEvent", on_delete=models.CASCADE, related_name="courtroom_session")
    provider = models.ForeignKey(
        CourtroomProvider,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sessions",
    )
    responsible_advocate = models.ForeignKey("staff.Lawyer", on_delete=models.PROTECT, related_name="responsible_courtroom_sessions", null=True, blank=True)
    backup_advocate = models.ForeignKey("staff.Lawyer", on_delete=models.SET_NULL, related_name="backup_courtroom_sessions", null=True, blank=True)
    link_source = models.CharField(max_length=30, choices=LinkSource.choices, blank=True, default="")
    link_source_reference = models.CharField(max_length=255, blank=True, default="")
    provider_detected = models.CharField(max_length=30, choices=CourtroomProvider.ProviderType.choices, blank=True, default="")
    link_verified = models.BooleanField(default=False)
    link_verified_at = models.DateTimeField(null=True, blank=True)
    link_verified_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="verified_courtroom_links")
    client_attendance_requirement = models.CharField(max_length=30, choices=ClientAttendance.choices, default=ClientAttendance.TO_BE_CONFIRMED)
    client_access_enabled = models.BooleanField(default=False)
    client_access_from = models.DateTimeField(null=True, blank=True)
    client_access_until = models.DateTimeField(null=True, blank=True)
    join_window_minutes_before = models.PositiveSmallIntegerField(default=30)
    join_window_minutes_after = models.PositiveSmallIntegerField(default=120)
    matter_called_at = models.DateTimeField(null=True, blank=True)
    matter_completed_at = models.DateTimeField(null=True, blank=True)
    status_updated_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="updated_courtroom_statuses")
    status_updated_at = models.DateTimeField(null=True, blank=True)
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
        READY_CHECK_COMPLETED = "READY_CHECK_COMPLETED", "Ready check completed"
        JOIN_REQUESTED = "JOIN_REQUESTED", "Join requested"
        PROVIDER_OPENED = "PROVIDER_OPENED", "Provider opened"
        JOIN_CONFIRMED = "JOIN_CONFIRMED", "Join confirmed"
        LEFT = "LEFT", "Left"
        TECHNICAL_DIFFICULTY = "TECHNICAL_DIFFICULTY", "Technical difficulty"
        MISSED = "MISSED", "Missed"
        CHECKED_IN = "CHECKED_IN", "Checked in (legacy)"
        JOINED = "JOINED", "Joined (legacy)"

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
    status = models.CharField(max_length=30, choices=AttendanceStatus.choices, default=AttendanceStatus.INVITED)
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


class CourtroomStatusHistory(models.Model):
    class Source(models.TextChoices):
        MANUAL = "MANUAL", "Manual"
        SYSTEM = "SYSTEM", "System"
        AI_SUGGESTION = "AI_SUGGESTION", "AI suggestion"
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(CourtroomSession, on_delete=models.CASCADE, related_name="status_history")
    previous_status = models.CharField(max_length=30, blank=True, default="")
    new_status = models.CharField(max_length=30, choices=CourtroomSession.Status.choices)
    actor = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, related_name="courtroom_status_changes")
    timestamp = models.DateTimeField(auto_now_add=True)
    note = models.TextField(blank=True, default="")
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.MANUAL)
    class Meta:
        db_table = "courtroom_status_history"
        ordering = ["timestamp"]


class CourtRecordingPermission(TimestampedModel):
    class Status(models.TextChoices):
        NOT_REQUESTED = "NOT_REQUESTED", "Not requested"
        REQUESTED = "REQUESTED", "Requested"
        GRANTED = "GRANTED", "Granted"
        REFUSED = "REFUSED", "Refused"
        REVOKED = "REVOKED", "Revoked"
    session = models.OneToOneField(CourtroomSession, on_delete=models.CASCADE, related_name="recording_permission")
    permission_status = models.CharField(max_length=20, choices=Status.choices, default=Status.NOT_REQUESTED)
    permission_scope = models.CharField(max_length=255, blank=True, default="")
    granted_by = models.CharField(max_length=255, blank=True, default="")
    granted_at = models.DateTimeField(null=True, blank=True)
    recorded_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="recorded_court_permissions")
    authority_note = models.TextField(blank=True, default="")
    supporting_document = models.ForeignKey("cases.CaseAttachment", on_delete=models.SET_NULL, null=True, blank=True, related_name="court_recording_permissions")
    audio_allowed = models.BooleanField(default=False)
    video_allowed = models.BooleanField(default=False)
    transcription_allowed = models.BooleanField(default=False)
    retention_until = models.DateField(null=True, blank=True)


class CourtroomLaunchGrant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(CourtroomSession, on_delete=models.CASCADE, related_name="launch_grants")
    user = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="courtroom_launch_grants")
    expires_at = models.DateTimeField()
    consumed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = "courtroom_launch_grants"
