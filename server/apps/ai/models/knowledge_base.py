import uuid

from django.conf import settings
from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class KnowledgeBaseCategory(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150, unique=True)
    slug = models.SlugField(max_length=170, unique=True)
    description = models.TextField(blank=True)
    suggested_question = models.CharField(max_length=240, blank=True)
    page_sections = models.JSONField(default=list, blank=True, help_text="Controlled homepage contexts where this category may be suggested.")
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "knowledge_base_categories"
        ordering = ("display_order", "name")
        verbose_name_plural = "Knowledge base categories"

    def __str__(self):
        return self.name


class KnowledgeBaseArticle(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=240)
    slug = models.SlugField(max_length=260, unique=True)
    category = models.ForeignKey(
        KnowledgeBaseCategory,
        on_delete=models.PROTECT,
        related_name="articles",
    )
    summary = models.TextField(blank=True)
    body = models.TextField()
    jurisdiction = models.CharField(max_length=120, default="Kenya")
    source_name = models.CharField(max_length=240)
    source_url = models.URLField(max_length=500, blank=True)
    source_reference = models.CharField(max_length=300, blank=True)
    last_verified_at = models.DateField(null=True, blank=True)
    keywords = models.TextField(blank=True, help_text="Comma-separated search terms.")
    is_published = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="knowledge_articles_created",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="knowledge_articles_updated",
    )

    class Meta:
        db_table = "knowledge_base_articles"
        ordering = ("category__display_order", "title")
        indexes = [
            models.Index(fields=("is_published", "category"), name="kb_article_public_idx"),
        ]

    def __str__(self):
        return self.title


class KnowledgeBaseQuestionLog(TimestampedModel):
    class Status(models.TextChoices):
        ANSWERED = "answered", "Answered"
        NO_SOURCE = "no_source", "No verified source"
        PROVIDER_UNAVAILABLE = "provider_unavailable", "Provider unavailable"
        ERROR = "error", "Error"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.TextField()
    answer = models.TextField(blank=True)
    retrieved_articles = models.ManyToManyField(
        KnowledgeBaseArticle,
        blank=True,
        related_name="question_logs",
    )
    retrieval_score = models.FloatField(default=0)
    model = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=40, choices=Status.choices)
    request_fingerprint = models.CharField(max_length=64, blank=True, db_index=True)
    user_agent_family = models.CharField(max_length=80, blank=True)

    class Meta:
        db_table = "knowledge_base_question_logs"
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.created_at:%Y-%m-%d %H:%M} - {self.status}"
