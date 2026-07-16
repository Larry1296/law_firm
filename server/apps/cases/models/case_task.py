import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class CaseTask(TimestampedModel):
    class TaskType(models.TextChoices):
        LIMITATION = "LIMITATION", "Limitation Deadline"
        FILING_DEADLINE = "FILING_DEADLINE", "Filing Deadline"
        SERVICE_DEADLINE = "SERVICE_DEADLINE", "Service Deadline"
        SUBMISSIONS_DEADLINE = "SUBMISSIONS_DEADLINE", "Submissions Deadline"
        APPEAL_DEADLINE = "APPEAL_DEADLINE", "Appeal Deadline"
        COURT_ATTENDANCE = "COURT_ATTENDANCE", "Court Attendance"
        CLIENT_FOLLOW_UP = "CLIENT_FOLLOW_UP", "Client Follow-Up"
        REGISTRY_FOLLOW_UP = "REGISTRY_FOLLOW_UP", "Registry Follow-Up"
        DOCUMENT_PREPARATION = "DOCUMENT_PREPARATION", "Document Preparation"
        BILLING = "BILLING", "Billing"
        OTHER = "OTHER", "Other"

    class TaskStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        BLOCKED = "BLOCKED", "Blocked"
        DONE = "DONE", "Done"
        CANCELLED = "CANCELLED", "Cancelled"
        OVERDUE = "OVERDUE", "Overdue"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey("cases.Case", on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    task_type = models.CharField(max_length=40, choices=TaskType.choices, default=TaskType.OTHER)
    status = models.CharField(max_length=30, choices=TaskStatus.choices, default=TaskStatus.PENDING)
    due_at = models.DateTimeField(null=True, blank=True)
    reminder_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    assigned_to = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_case_tasks",
    )
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_case_tasks",
    )
    is_client_visible = models.BooleanField(default=False)

    class Meta:
        db_table = "case_tasks"
        ordering = ["due_at", "-created_at"]
        indexes = [
            models.Index(fields=["case", "status"]),
            models.Index(fields=["assigned_to", "status"]),
            models.Index(fields=["due_at"]),
            models.Index(fields=["task_type"]),
        ]

    def __str__(self):
        return f"{self.case.case_number} - {self.title}"
