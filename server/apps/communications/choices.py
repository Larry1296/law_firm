from django.db import models


class AnnouncementAudience(models.TextChoices):
    ALL_STAFF = "ALL_STAFF", "All Staff"
    TARGETED = "TARGETED", "Targeted Staff"


class ChatThreadType(models.TextChoices):
    DIRECT_STAFF = "DIRECT_STAFF", "Admin Staff Direct Chat"
    CASE_CLIENT = "CASE_CLIENT", "Case Client Communication"


class ChatMessageType(models.TextChoices):
    TEXT = "TEXT", "Text"
    SYSTEM = "SYSTEM", "System"