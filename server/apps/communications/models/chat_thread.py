import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel
from apps.communications.choices import ChatThreadType


class ChatThread(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(
        "firm.LawFirm",
        on_delete=models.CASCADE,
        related_name="chat_threads",
    )
    thread_type = models.CharField(max_length=30, choices=ChatThreadType.choices)
    thread_key = models.CharField(
        max_length=255,
        unique=True,
        help_text="Stable unique key, for example direct_staff:<firm>:<admin>:<staff> or case_client:<case>.",
    )
    case = models.ForeignKey(
        "cases.Case",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="communication_threads",
    )
    subject = models.CharField(max_length=255, blank=True, default="")
    created_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_chat_threads",
    )
    last_message_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "communication_chat_threads"
        ordering = ["-last_message_at", "-created_at"]
        indexes = [
            models.Index(fields=["firm", "thread_type"]),
            models.Index(fields=["firm", "is_active"]),
            models.Index(fields=["case"]),
            models.Index(fields=["last_message_at"]),
        ]

    def __str__(self):
        return self.subject or self.thread_key


class ChatThreadParticipant(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    thread = models.ForeignKey(
        ChatThread,
        on_delete=models.CASCADE,
        related_name="participants",
    )
    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="chat_thread_participants",
    )
    can_reply = models.BooleanField(default=True)
    last_read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "communication_chat_thread_participants"
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["thread", "user"],
                name="unique_thread_participant",
            ),
        ]
        indexes = [
            models.Index(fields=["user", "can_reply"]),
        ]

    def __str__(self):
        return f"{self.thread} - {self.user}"