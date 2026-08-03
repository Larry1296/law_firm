import re
from urllib.parse import urlparse

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.ai.models import KnowledgeBaseArticle, PublicKnowledgeAudit


class PublicKnowledgeEligibility:
    """The single publication boundary used by all public chatbot retrieval."""

    @staticmethod
    def queryset(*, firm, now=None):
        if firm is None:
            return KnowledgeBaseArticle.objects.none()
        now = now or timezone.now()
        return KnowledgeBaseArticle.objects.filter(
            firm=firm,
            visibility=KnowledgeBaseArticle.Visibility.PUBLIC,
            approval_status=KnowledgeBaseArticle.ApprovalStatus.PUBLISHED,
            is_published=True,
            approved_by__isnull=False,
            approved_at__isnull=False,
            published_at__isnull=False,
            published_at__lte=now,
            withdrawn_at__isnull=True,
        ).filter(Q(expires_at__isnull=True) | Q(expires_at__gt=now)).exclude(body__regex=r"^\s*$")


class PublicKnowledgeSafetyValidator:
    BLOCKED_PATTERNS = (
        (r"\b(?:national\s*id|passport)\s*(?:number|no\.?|:)\s*[:#-]?\s*[a-z0-9-]{5,}", "identity document number"),
        (r"\b(?:password|api[_ -]?key|access[_ -]?token|secret)\s*[:=]\s*\S+", "credential or secret"),
        (r"\b(?:client|trust)\s*account\s*(?:number|no\.?|:)\s*[:#-]?\s*\d{5,}", "client or trust account detail"),
        (r"\b(?:matter|case)\s*(?:number|no\.?|:)\s*[:#-]?\s*[a-z0-9/-]{5,}", "matter or case number"),
        (r"https?://(?:localhost|127\.0\.0\.1|[^/\s]+/(?:admin|api/internal))(?:/|\b)", "internal URL"),
        (r"\b(?:strictly confidential|internal only|attorney work product)\b", "confidential classification"),
    )

    @classmethod
    def validate(cls, content):
        findings = [label for pattern, label in cls.BLOCKED_PATTERNS if re.search(pattern, content or "", re.I)]
        if findings:
            raise ValidationError({"body": [f"Publication blocked: detected {', '.join(findings)}."]})

    @staticmethod
    def validate_url(value):
        if not value:
            return
        parsed = urlparse(value)
        if parsed.scheme != "https" or not parsed.netloc or parsed.hostname in {"localhost", "127.0.0.1"}:
            raise ValidationError({"source_url": ["Only a genuine public HTTPS URL may be published."]})
        if parsed.path.startswith(("/admin", "/api/")):
            raise ValidationError({"source_url": ["Internal administration and API URLs cannot be published."]})


class PublicKnowledgeWorkflow:
    @staticmethod
    def audit(article, actor, action, details=None):
        PublicKnowledgeAudit.objects.create(
            article=article, firm=article.firm, actor=actor, action=action,
            version=article.version, details=details or {},
        )

    @classmethod
    @transaction.atomic
    def transition(cls, *, article, actor, action, publish_at=None, confirmed=False):
        article = KnowledgeBaseArticle.objects.select_for_update().get(pk=article.pk, firm=article.firm)
        now = timezone.now()
        if action == "submit":
            if article.approval_status not in {article.ApprovalStatus.DRAFT, article.ApprovalStatus.REJECTED}:
                raise ValidationError("Only a draft or rejected item can be submitted.")
            article.approval_status = article.ApprovalStatus.PENDING
        elif action == "approve":
            if article.approval_status != article.ApprovalStatus.PENDING:
                raise ValidationError("Only pending content can be approved.")
            PublicKnowledgeSafetyValidator.validate(article.body)
            PublicKnowledgeSafetyValidator.validate_url(article.source_url)
            article.approval_status = article.ApprovalStatus.APPROVED
            article.approved_by = actor
            article.approved_at = now
        elif action == "publish":
            if not confirmed:
                raise ValidationError({"confirmed": ["Explicit publication confirmation is required."]})
            if article.approval_status not in {article.ApprovalStatus.APPROVED, article.ApprovalStatus.PUBLISHED}:
                raise ValidationError("Only approved content can be published.")
            PublicKnowledgeSafetyValidator.validate(article.body)
            PublicKnowledgeSafetyValidator.validate_url(article.source_url)
            article.approval_status = article.ApprovalStatus.PUBLISHED
            article.published_at = publish_at or now
            article.is_published = True
            article.withdrawn_at = None
            article.withdrawn_by = None
        elif action == "withdraw":
            article.approval_status = article.ApprovalStatus.WITHDRAWN
            article.withdrawn_at = now
            article.withdrawn_by = actor
            article.is_published = False
        elif action == "reject":
            article.approval_status = article.ApprovalStatus.REJECTED
            article.is_published = False
        else:
            raise ValidationError("Unsupported publication action.")
        article.updated_by = actor
        article.save()
        cls.audit(article, actor, action, {"published_at": article.published_at.isoformat() if article.published_at else None})
        return article

    @classmethod
    @transaction.atomic
    def revise(cls, *, article, actor):
        latest = KnowledgeBaseArticle.objects.select_for_update().filter(
            firm=article.firm, slug__startswith=article.slug.split("--v")[0]
        ).order_by("-version").first()
        version = (latest.version if latest else article.version) + 1
        root_slug = article.slug.split("--v")[0]
        revised = KnowledgeBaseArticle.objects.create(
            firm=article.firm, title=article.title, slug=f"{root_slug}--v{version}",
            category=article.category, public_category=article.public_category,
            summary=article.summary, body=article.body, jurisdiction=article.jurisdiction,
            source_name=article.source_name, source_url=article.source_url,
            source_reference=article.source_reference, keywords=article.keywords,
            visibility=article.visibility, source_type=article.source_type,
            version=version, created_by=actor, updated_by=actor,
        )
        cls.audit(revised, actor, "revise", {"previous_article_id": str(article.id)})
        return revised
