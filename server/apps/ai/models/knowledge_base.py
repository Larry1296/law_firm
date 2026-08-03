import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

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
    class Visibility(models.TextChoices):
        PUBLIC = "public", "Public"
        INTERNAL = "internal", "Internal"

    class ApprovalStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        PENDING = "pending", "Pending approval"
        APPROVED = "approved", "Approved"
        PUBLISHED = "published", "Published"
        WITHDRAWN = "withdrawn", "Withdrawn"
        REJECTED = "rejected", "Rejected"
        EXPIRED = "expired", "Expired"

    class SourceType(models.TextChoices):
        FIRM_PROFILE = "firm_profile", "Firm profile"
        PRACTICE_AREA = "practice_area", "Practice area"
        PUBLIC_PAGE = "public_page", "Public website page"
        PUBLIC_POLICY = "public_policy", "Public policy"
        OTHER = "other", "Other approved public information"

    class PublicCategory(models.TextChoices):
        OVERVIEW = "firm_overview", "Firm overview"
        HISTORY = "history", "History"
        PRACTICE_AREA = "practice_area", "Practice area"
        LEGAL_SERVICE = "legal_service", "Legal service"
        ADVOCATE = "advocate_biography", "Public advocate biography"
        LOCATION = "office_location", "Office location"
        CONTACT = "contact_information", "Contact information"
        HOURS = "working_hours", "Working hours"
        CONSULTATION = "consultation", "Consultation procedure"
        APPOINTMENT = "appointment", "Appointment information"
        FEES = "public_fees", "Public fees information"
        FAQ = "faq", "Frequently asked questions"
        CAREERS = "careers", "Careers"
        ANNOUNCEMENT = "announcement", "Public announcement"
        ARTICLE = "published_article", "Published article"
        COMPLAINTS = "complaints", "Complaints procedure"
        PRIVACY = "privacy_terms", "Privacy and terms"
        OTHER = "other", "Other approved public information"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(
        "firm.LawFirm", null=True, blank=True, on_delete=models.CASCADE,
        related_name="public_knowledge_articles",
        help_text="Owning tenant for firm-specific public knowledge; null only for approved general legal information.",
    )
    title = models.CharField(max_length=240)
    slug = models.SlugField(max_length=260, unique=True)
    category = models.ForeignKey(
        KnowledgeBaseCategory,
        on_delete=models.PROTECT,
        related_name="articles",
    )
    public_category = models.CharField(max_length=40, choices=PublicCategory.choices, default=PublicCategory.OTHER)
    summary = models.TextField(blank=True)
    body = models.TextField()
    jurisdiction = models.CharField(max_length=120, default="Kenya")
    source_name = models.CharField(max_length=240)
    source_url = models.URLField(max_length=500, blank=True)
    source_reference = models.CharField(max_length=300, blank=True)
    last_verified_at = models.DateField(null=True, blank=True)
    keywords = models.TextField(blank=True, help_text="Comma-separated search terms.")
    is_published = models.BooleanField(default=False)
    visibility = models.CharField(max_length=20, choices=Visibility.choices, default=Visibility.PUBLIC)
    approval_status = models.CharField(max_length=20, choices=ApprovalStatus.choices, default=ApprovalStatus.DRAFT)
    published_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    source_type = models.CharField(max_length=30, choices=SourceType.choices, default=SourceType.OTHER)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="knowledge_articles_approved")
    approved_at = models.DateTimeField(null=True, blank=True)
    version = models.PositiveIntegerField(default=1)
    withdrawn_at = models.DateTimeField(null=True, blank=True)
    withdrawn_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="knowledge_articles_withdrawn")
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
            models.Index(fields=("firm", "is_published"), name="kb_article_firm_public_idx"),
            models.Index(fields=("firm", "visibility", "approval_status", "published_at"), name="kb_public_eligible_idx"),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(version__gte=1), name="kb_article_version_positive"),
        ]

    def __str__(self):
        return self.title

    @property
    def is_publicly_eligible(self):
        now = timezone.now()
        return bool(
            self.firm_id and self.visibility == self.Visibility.PUBLIC
            and self.approval_status == self.ApprovalStatus.PUBLISHED
            and self.is_published and self.approved_by_id and self.approved_at
            and self.published_at and self.published_at <= now
            and not self.withdrawn_at and (not self.expires_at or self.expires_at > now)
            and self.body.strip()
        )


class PublicKnowledgeAudit(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    article = models.ForeignKey(KnowledgeBaseArticle, on_delete=models.CASCADE, related_name="publication_audits")
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.CASCADE, related_name="public_knowledge_audits")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="public_knowledge_audits")
    action = models.CharField(max_length=30)
    version = models.PositiveIntegerField()
    details = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "public_knowledge_audits"
        ordering = ("-created_at",)
        indexes = [models.Index(fields=("firm", "action", "created_at"), name="public_kb_audit_idx")]


class KnowledgeBaseQuestionLog(TimestampedModel):
    class Status(models.TextChoices):
        ANSWERED = "answered", "Answered"
        NO_SOURCE = "no_source", "No verified source"
        PROVIDER_UNAVAILABLE = "provider_unavailable", "Provider unavailable"
        ERROR = "error", "Error"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", null=True, blank=True, on_delete=models.SET_NULL, related_name="public_ai_question_logs")
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
