from django.contrib import admin
from django.utils import timezone

from .models import (
    AIAssessmentAudit,
    AICaseAssessment,
    KnowledgeBaseArticle,
    KnowledgeBaseCategory,
    KnowledgeBaseQuestionLog,
    LegalProvision,
    LegalSourceDocument,
    AIConfigurationVersion,
    AIEvaluationRun,
    AIFindingFeedback,
    KnowledgeIndexEntry,
    MatterOutcome,
    PublicAdvocateProfile,
    PublicFirmKnowledgePolicy,
    PublicKnowledgeAudit,
)
from .services.continuous_learning_service import ConfigurationVersionService, KnowledgeIndexService


@admin.register(KnowledgeBaseCategory)
class KnowledgeBaseCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "display_order", "is_active", "updated_at")
    list_editable = ("display_order", "is_active")
    search_fields = ("name", "description", "suggested_question", "page_sections")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(KnowledgeBaseArticle)
class KnowledgeBaseArticleAdmin(admin.ModelAdmin):
    list_display = ("title", "firm", "public_category", "approval_status", "version", "published_at", "updated_at")
    list_filter = ("approval_status", "visibility", "public_category", "firm")
    search_fields = ("title", "summary", "body", "keywords", "source_reference")
    prepopulated_fields = {"slug": ("title",)}
    raw_id_fields = ("created_by", "updated_by")
    list_select_related = ("category",)

    def save_model(self, request, obj, form, change):
        if not obj.created_by_id:
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(PublicKnowledgeAudit)
class PublicKnowledgeAuditAdmin(admin.ModelAdmin):
    list_display = ("created_at", "firm", "article", "action", "version", "actor")
    list_filter = ("action", "firm")
    readonly_fields = tuple(field.name for field in PublicKnowledgeAudit._meta.fields)


@admin.register(KnowledgeBaseQuestionLog)
class KnowledgeBaseQuestionLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "status", "retrieval_score", "model", "question_preview")
    list_filter = ("status", "model", "created_at")
    search_fields = ("question", "answer", "request_fingerprint")
    readonly_fields = tuple(field.name for field in KnowledgeBaseQuestionLog._meta.fields) + ("retrieved_articles",)

    def question_preview(self, obj):
        return obj.question[:100]


@admin.register(LegalSourceDocument)
class LegalSourceDocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "source_type", "jurisdiction", "is_official_primary_source", "is_published", "last_verified_at")
    list_filter = ("source_type", "jurisdiction", "is_official_primary_source", "is_published")
    search_fields = ("title", "official_url", "source_checksum")
    prepopulated_fields = {"slug": ("title",)}


@admin.register(LegalProvision)
class LegalProvisionAdmin(admin.ModelAdmin):
    list_display = ("stable_key", "article_number", "heading", "chapter", "is_published")
    list_filter = ("document", "unit_type", "chapter", "is_published")
    search_fields = ("article_number", "heading", "text", "chapter", "part")
    list_select_related = ("document",)


@admin.register(AICaseAssessment)
class AICaseAssessmentAdmin(admin.ModelAdmin):
    list_display = ("case", "version", "priority", "confidence", "is_stale", "analyzed_at", "requested_by")
    list_filter = ("priority", "confidence", "is_stale", "status", "scoring_version")
    search_fields = ("case__case_number", "case__title")
    readonly_fields = tuple(field.name for field in AICaseAssessment._meta.fields) + ("included_documents", "retrieved_provisions")


@admin.register(AIAssessmentAudit)
class AIAssessmentAuditAdmin(admin.ModelAdmin):
    list_display = ("created_at", "case", "actor", "action", "result_status", "model")
    list_filter = ("action", "result_status", "provider", "model")
    search_fields = ("case__case_number", "case__title")
    readonly_fields = tuple(field.name for field in AIAssessmentAudit._meta.fields)


@admin.register(KnowledgeIndexEntry)
class KnowledgeIndexEntryAdmin(admin.ModelAdmin):
    list_display = ("source_kind", "source_id", "source_version", "status", "indexed_at")
    list_filter = ("status", "source_kind")
    readonly_fields = tuple(field.name for field in KnowledgeIndexEntry._meta.fields)
    actions = ("reindex_all_approved_sources",)

    @admin.action(description="Re-index all approved sources")
    def reindex_all_approved_sources(self, request, queryset):
        result = KnowledgeIndexService.rebuild()
        self.message_user(request, f"Index rebuilt: {result}")


@admin.register(AIConfigurationVersion)
class AIConfigurationVersionAdmin(admin.ModelAdmin):
    list_display = ("kind", "version", "meets_thresholds", "is_active", "approved_by", "approved_at")
    list_filter = ("kind", "meets_thresholds", "is_active")
    actions = ("activate_evaluated_version",)

    @admin.action(description="Activate selected evaluated version")
    def activate_evaluated_version(self, request, queryset):
        for item in queryset:
            ConfigurationVersionService.activate(item, request.user)


@admin.register(AIFindingFeedback)
class AIFindingFeedbackAdmin(admin.ModelAdmin):
    list_display = ("case", "finding_key", "rating", "review_status", "submitted_by", "created_at")
    list_filter = ("rating", "review_status")
    readonly_fields = ("assessment", "case", "finding_key", "rating", "correction", "model_version", "prompt_version", "retrieval_sources", "submitted_by")


@admin.register(MatterOutcome)
class MatterOutcomeAdmin(admin.ModelAdmin):
    list_display = ("case", "category", "concluded_on", "quality_status", "verified_by")
    list_filter = ("quality_status", "category", "appeal_filed")
    search_fields = ("case__case_number", "case__title")


@admin.register(AIEvaluationRun)
class AIEvaluationRunAdmin(admin.ModelAdmin):
    list_display = ("dataset_version", "passed", "run_by", "created_at")
    list_filter = ("passed", "dataset_version")


@admin.register(PublicFirmKnowledgePolicy)
class PublicFirmKnowledgePolicyAdmin(admin.ModelAdmin):
    list_display = ("firm", "is_published", "include_practice_areas", "include_contact", "include_location", "include_hours", "updated_at")
    list_filter = ("is_published", "include_contact", "include_location", "include_hours")
    readonly_fields = ("approved_by", "approved_at")

    def save_model(self, request, obj, form, change):
        if obj.is_published:
            obj.approved_by = request.user
            obj.approved_at = timezone.now()
        super().save_model(request, obj, form, change)


@admin.register(PublicAdvocateProfile)
class PublicAdvocateProfileAdmin(admin.ModelAdmin):
    list_display = ("display_name", "lawyer", "is_published", "approved_by", "updated_at")
    list_filter = ("is_published",)
    search_fields = ("display_name", "public_bio", "lawyer__user__first_name", "lawyer__user__last_name")
    readonly_fields = ("approved_by", "approved_at")

    def save_model(self, request, obj, form, change):
        if obj.is_published:
            obj.approved_by = request.user
            obj.approved_at = timezone.now()
        super().save_model(request, obj, form, change)
