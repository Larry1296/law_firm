from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.cases.models import Case, CaseAttachment, CaseEvent, CaseFiling, CaseTask
from apps.ai.models import KnowledgeBaseArticle, LegalProvision, PublicFirmKnowledgePolicy
from apps.ai.services.continuous_learning_service import KnowledgeIndexService
from apps.firm.models import LawFirm


def _mark_case_stale(case_id):
    from apps.ai.models import AICaseAssessment
    AICaseAssessment.objects.filter(case_id=case_id, is_stale=False).update(is_stale=True)


@receiver([post_save, post_delete], sender=CaseEvent)
@receiver([post_save, post_delete], sender=CaseTask)
@receiver([post_save, post_delete], sender=CaseAttachment)
@receiver([post_save, post_delete], sender=CaseFiling)
def mark_related_case_assessments_stale(sender, instance, **kwargs):
    _mark_case_stale(instance.case_id)


@receiver(post_save, sender=Case)
def mark_updated_case_assessments_stale(sender, instance, created, **kwargs):
    if not created:
        _mark_case_stale(instance.id)


@receiver(post_save, sender=KnowledgeBaseArticle)
@receiver(post_save, sender=LegalProvision)
def index_approved_knowledge(sender, instance, **kwargs):
    KnowledgeIndexService.sync(instance)
    if sender is LegalProvision:
        from apps.ai.models import AICaseAssessment
        AICaseAssessment.objects.filter(is_stale=False).update(is_stale=True)


@receiver(post_delete, sender=KnowledgeBaseArticle)
@receiver(post_delete, sender=LegalProvision)
def withdraw_deleted_knowledge(sender, instance, **kwargs):
    kind = "knowledge_article" if sender is KnowledgeBaseArticle else "legal_provision"
    from apps.ai.models import KnowledgeIndexEntry
    KnowledgeIndexEntry.objects.filter(source_kind=kind, source_id=instance.id).update(
        status=KnowledgeIndexEntry.Status.WITHDRAWN
    )


@receiver(post_save, sender=LawFirm)
def sync_changed_firm(sender, instance, created, **kwargs):
    if created and not hasattr(instance, "public_knowledge_policy"):
        PublicFirmKnowledgePolicy.objects.create(
            firm=instance, is_published=False,
        )
