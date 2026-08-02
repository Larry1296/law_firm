from django.db.models.signals import m2m_changed, post_delete, post_migrate, post_save
from django.dispatch import receiver
from django.utils import timezone

from apps.cases.models import Case, CaseAttachment, CaseEvent, CaseFiling, CaseTask
from apps.ai.models import KnowledgeBaseArticle, LegalProvision, PublicAdvocateProfile, PublicFirmKnowledgePolicy
from apps.ai.services.continuous_learning_service import KnowledgeIndexService
from apps.ai.services.firm_knowledge_service import FirmKnowledgeService
from apps.firm.models import Branch, FirmSetting, LawFirm, PracticeArea
from apps.staff.models import Lawyer


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
            firm=instance, is_published=instance.is_active,
            include_contact=True, include_location=True, include_hours=True,
            approved_by=instance.owner, approved_at=timezone.now(),
        )
    FirmKnowledgeService.sync(instance)


@receiver(post_migrate)
def ensure_existing_firm_public_knowledge(sender, **kwargs):
    if sender.name != "apps.ai":
        return
    for firm in LawFirm.objects.select_related("owner"):
        PublicFirmKnowledgePolicy.objects.get_or_create(
            firm=firm,
            defaults={
                "is_published": firm.is_active, "include_contact": True,
                "include_location": True, "include_hours": True,
                "approved_by": firm.owner, "approved_at": timezone.now(),
            },
        )
        FirmKnowledgeService.sync(firm)


@receiver(post_save, sender=FirmSetting)
@receiver(post_save, sender=PracticeArea)
@receiver(post_save, sender=Branch)
def sync_changed_firm_record(sender, instance, **kwargs):
    FirmKnowledgeService.sync(instance.firm)


@receiver(post_delete, sender=PracticeArea)
@receiver(post_delete, sender=Branch)
def sync_deleted_firm_record(sender, instance, **kwargs):
    FirmKnowledgeService.sync(instance.firm)


@receiver(post_save, sender=PublicFirmKnowledgePolicy)
def sync_publication_policy(sender, instance, **kwargs):
    FirmKnowledgeService.sync(instance.firm)


@receiver(post_save, sender=PublicAdvocateProfile)
@receiver(post_delete, sender=PublicAdvocateProfile)
def sync_public_advocate(sender, instance, **kwargs):
    FirmKnowledgeService.sync(instance.lawyer.law_firm)


@receiver(post_save, sender=Lawyer)
def sync_changed_public_lawyer(sender, instance, **kwargs):
    if hasattr(instance, "public_ai_profile"):
        FirmKnowledgeService.sync(instance.law_firm)


@receiver(m2m_changed, sender=Lawyer.practice_areas.through)
def sync_public_lawyer_practice_areas(sender, instance, **kwargs):
    if hasattr(instance, "public_ai_profile"):
        FirmKnowledgeService.sync(instance.law_firm)
