from django.db import transaction
from django.utils import timezone

from apps.ai.models import AIConfigurationVersion, KnowledgeIndexEntry


class KnowledgeIndexService:
    """Metadata index over approved DB content; retrieval still reads the canonical records."""

    @classmethod
    def sync(cls, instance):
        if instance.__class__.__name__ == "KnowledgeBaseArticle":
            from apps.ai.services.public_knowledge_service import PublicKnowledgeEligibility
            kind = "knowledge_article"
            approved = instance.category.is_active and PublicKnowledgeEligibility.queryset(firm=instance.firm).filter(pk=instance.pk).exists()
            content = f"{instance.title}\n{instance.summary}\n{instance.body}\n{instance.keywords}"
            metadata = {"namespace": f"public-firm-{instance.firm_id}" if instance.firm_id else "public-official-legal", "firm_id": str(instance.firm_id or ""), "knowledge_item_id": str(instance.id), "category": instance.public_category, "visibility": instance.visibility, "approval_status": instance.approval_status, "published_at": str(instance.published_at or ""), "version": instance.version, "source_type": instance.source_type, "jurisdiction": instance.jurisdiction, "verified_at": str(instance.last_verified_at or "")}
        else:
            kind = "legal_provision"
            approved = instance.is_published and instance.document.is_published
            content = f"{instance.heading}\n{instance.text}"
            metadata = {"source_type": instance.document.source_type, "jurisdiction": instance.document.jurisdiction, "effective_date": str(instance.document.effective_date or ""), "verified_at": str(instance.document.last_verified_at or "")}
        checksum = KnowledgeIndexEntry.checksum(content)
        current = KnowledgeIndexEntry.objects.filter(source_kind=kind, source_id=instance.id).first()
        changed = not current or current.content_checksum != checksum
        version = (current.source_version + 1) if current and changed else (current.source_version if current else 1)
        entry, _ = KnowledgeIndexEntry.objects.update_or_create(
            source_kind=kind, source_id=instance.id,
            defaults={"source_version": version, "content_checksum": checksum, "metadata": metadata,
                      "status": KnowledgeIndexEntry.Status.INDEXED if approved else KnowledgeIndexEntry.Status.WITHDRAWN,
                      "indexed_at": timezone.now(), "error_code": ""},
        )
        return entry

    @classmethod
    def rebuild(cls):
        from apps.ai.models import KnowledgeBaseArticle, LegalProvision
        counts = {"indexed": 0, "withdrawn": 0, "failed": 0}
        for source in list(KnowledgeBaseArticle.objects.select_related("category")) + list(LegalProvision.objects.select_related("document")):
            try:
                entry = cls.sync(source)
                counts[entry.status.lower()] += 1
            except Exception:
                counts["failed"] += 1
        return counts


class ConfigurationVersionService:
    @staticmethod
    @transaction.atomic
    def activate(version, reviewer):
        if not reviewer.is_authenticated or reviewer.role != "admin":
            raise PermissionError("Administrator approval is required.")
        if not version.meets_thresholds:
            raise ValueError("Evaluation thresholds have not been met.")
        AIConfigurationVersion.objects.filter(kind=version.kind, is_active=True).update(is_active=False)
        version.is_active = True
        version.approved_by = reviewer
        version.approved_at = timezone.now()
        version.save(update_fields=("is_active", "approved_by", "approved_at", "updated_at"))
        return version

    @staticmethod
    def rollback(kind, target, reviewer):
        if target.kind != kind:
            raise ValueError("Rollback target has the wrong configuration kind.")
        return ConfigurationVersionService.activate(target, reviewer)


class TrainingExportService:
    """Produces provenance-only candidates; privileged content/documents are never exported."""

    @staticmethod
    def reviewed_manifest(requester):
        if not requester.is_authenticated or requester.role != "admin":
            raise PermissionError("Administrator approval is required.")
        from apps.ai.models import AIFindingFeedback
        return [
            {
                "feedback_id": str(item.id),
                "assessment_id": str(item.assessment_id),
                "tenant_id": str(item.case.firm_id),
                "rating": item.rating,
                "model_version": item.model_version,
                "prompt_version": item.prompt_version,
                "contains_client_content": False,
                "content_exported": False,
            }
            for item in AIFindingFeedback.objects.filter(
                review_status=AIFindingFeedback.ReviewStatus.TRAINING,
                reviewed_by__isnull=False,
            ).select_related("case")
        ]
