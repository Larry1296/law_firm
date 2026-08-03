from django.utils.text import slugify
from rest_framework import serializers

from apps.ai.models import KnowledgeBaseArticle, KnowledgeBaseCategory
from apps.ai.services.public_knowledge_service import PublicKnowledgeSafetyValidator, PublicKnowledgeWorkflow


class PublicKnowledgeItemSerializer(serializers.ModelSerializer):
    category_label = serializers.CharField(source="get_public_category_display", read_only=True)
    status_label = serializers.CharField(source="get_approval_status_display", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.full_name", read_only=True)
    withdrawn_by_name = serializers.CharField(source="withdrawn_by.full_name", read_only=True)
    history = serializers.SerializerMethodField()

    class Meta:
        model = KnowledgeBaseArticle
        fields = ("id", "title", "slug", "public_category", "category_label", "summary", "body", "visibility", "approval_status", "status_label", "is_published", "published_at", "expires_at", "source_url", "source_type", "approved_by_name", "approved_at", "version", "withdrawn_at", "withdrawn_by_name", "created_at", "updated_at", "history")
        read_only_fields = ("id", "slug", "approval_status", "is_published", "published_at", "approved_by_name", "approved_at", "version", "withdrawn_at", "withdrawn_by_name", "created_at", "updated_at", "history")

    def get_history(self, obj):
        if not self.context.get("include_history"):
            return []
        return [{"action": item.action, "version": item.version, "actor": item.actor.full_name if item.actor else "Former user", "created_at": item.created_at, "details": item.details} for item in obj.publication_audits.select_related("actor").all()]

    def validate(self, attrs):
        PublicKnowledgeSafetyValidator.validate(attrs.get("body", getattr(self.instance, "body", "")))
        PublicKnowledgeSafetyValidator.validate_url(attrs.get("source_url", getattr(self.instance, "source_url", "")))
        return attrs

    def create(self, validated_data):
        firm, actor = self.context["firm"], self.context["request"].user
        kind = validated_data["public_category"]
        category, _ = KnowledgeBaseCategory.objects.get_or_create(slug=f"public-{kind}", defaults={"name": dict(KnowledgeBaseArticle.PublicCategory.choices)[kind], "is_active": True})
        base = slugify(validated_data["title"])[:190] or "public-information"
        validated_data.update(firm=firm, category=category, slug=f"{base}-{str(firm.id)[:8]}", source_name=firm.name, jurisdiction="Firm information", created_by=actor, updated_by=actor)
        article = super().create(validated_data)
        PublicKnowledgeWorkflow.audit(article, actor, "create")
        return article

    def update(self, instance, validated_data):
        if instance.approval_status not in {instance.ApprovalStatus.DRAFT, instance.ApprovalStatus.REJECTED}:
            raise serializers.ValidationError("Create a revised version before editing approved or published content.")
        instance.updated_by = self.context["request"].user
        article = super().update(instance, validated_data)
        PublicKnowledgeWorkflow.audit(article, self.context["request"].user, "edit")
        return article
