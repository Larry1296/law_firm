import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel
from apps.communications.choices import ChatMessageType


class ChatMessage(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    thread = models.ForeignKey(
        "communications.ChatThread",
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_chat_messages",
    )
    body = models.TextField()
    message_type = models.CharField(
        max_length=20,
        choices=ChatMessageType.choices,
        default=ChatMessageType.TEXT,
    )
    is_system_message = models.BooleanField(default=False)
    is_forwarded = models.BooleanField(default=False)
    forwarded_from = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="forwarded_messages",
    )
    forward_direction = models.CharField(max_length=30, blank=True, default="")

    class Meta:
        db_table = "communication_chat_messages"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["thread", "created_at"]),
            models.Index(fields=["sender"]),
        ]

    def __str__(self):
        return f"{self.thread} - {self.created_at}"
