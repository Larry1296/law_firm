from rest_framework import serializers

from apps.cases.models import DestructionLog, GeneratedClosingDocument, MatterArchive, MatterClosure, RetentionReview


class MatterClosureSerializer(serializers.ModelSerializer):
    blocking_reasons = serializers.SerializerMethodField()

    class Meta:
        model = MatterClosure
        fields = "__all__"
        read_only_fields = (
            "firm", "matter", "status", "requested_by", "responsible_advocate_approved_by",
            "finance_approved_by", "administrative_approved_by", "final_closure_date",
            "reopening_reason", "reopened_by", "reopened_at",
        )

    def get_blocking_reasons(self, obj):
        from apps.cases.services.matter_governance_service import MatterClosureService
        return MatterClosureService.blocking_reasons(obj)


class MatterArchiveSerializer(serializers.ModelSerializer):
    retention_reviews = serializers.SerializerMethodField()
    access_history = serializers.SerializerMethodField()
    destruction_log = serializers.SerializerMethodField()
    document_inventory = serializers.SerializerMethodField()

    class Meta:
        model = MatterArchive
        fields = "__all__"
        read_only_fields = ("firm", "matter", "approved_by")

    def get_retention_reviews(self, obj):
        return [{"id": item.id, "assessment": item.assessment, "outcome": item.outcome,
                 "reason": item.reason, "next_review_date": item.next_review_date,
                 "reviewed_by": item.reviewed_by_id, "approved_by": item.approved_by_id,
                 "approved_at": item.approved_at} for item in obj.retention_reviews.all()]

    def get_access_history(self, obj):
        return [{"id": item.id, "user": item.user_id, "purpose": item.purpose,
                 "accessed_at": item.accessed_at} for item in obj.access_history.all()]

    def get_destruction_log(self, obj):
        try:
            item = obj.destruction_log
        except DestructionLog.DoesNotExist:
            return None
        return {"id": item.id, "matter_reference": item.matter_reference,
                "records_approved": item.records_approved, "records_excluded": item.records_excluded,
                "approval_date": item.approval_date, "destruction_date": item.destruction_date,
                "method": item.method, "performed_by": item.performed_by,
                "verifier": item.verifier, "certificate_reference": item.certificate_reference,
                "electronic_deletion_confirmed": item.electronic_deletion_confirmed,
                "backup_handling_decision": item.backup_handling_decision}

    def get_document_inventory(self, obj):
        from apps.documents.models import MatterDocumentReference
        records = MatterDocumentReference.objects.filter(case=obj.matter, is_active=True).select_related("document")
        return [{"id": item.document_id, "title": item.document.title,
                 "reference": item.document.reference, "copy_type": item.document.source_copy_type,
                 "physical_copy_retained": item.document.physical_copy_retained,
                 "content_destroyed_at": item.document.content_destroyed_at} for item in records]


class RetentionReviewSerializer(serializers.ModelSerializer):
    REQUIRED_ASSESSMENTS = {
        "limitation_periods", "tax_accounting", "aml_due_diligence", "appeal_review",
        "enforcement_risk", "complaints_negligence", "audits_investigations",
        "insurance", "special_originals", "client_instructions", "data_protection",
        "legal_hold", "other_preservation",
    }

    class Meta:
        model = RetentionReview
        fields = ("assessment", "outcome", "reason", "next_review_date")

    def validate_assessment(self, value):
        missing = sorted(self.REQUIRED_ASSESSMENTS - set(value))
        if missing:
            raise serializers.ValidationError(
                f"Record every retention consideration; missing: {', '.join(missing)}."
            )
        if any(item is None or (isinstance(item, str) and not item.strip()) for item in value.values()):
            raise serializers.ValidationError("Each retention consideration requires a recorded conclusion.")
        return value


class DestructionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DestructionLog
        exclude = ("firm", "archive", "matter_reference", "approval_authority", "created_at")


class ReasonSerializer(serializers.Serializer):
    reason = serializers.CharField()


class GenerateClosingDocumentSerializer(serializers.Serializer):
    document_type = serializers.ChoiceField(choices=GeneratedClosingDocument.Type.choices)


class ArchiveAccessSerializer(serializers.Serializer):
    purpose = serializers.CharField()


class LegalHoldSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=("PLACE", "RELEASE"), default="PLACE")
    reason = serializers.CharField()
    authority = serializers.CharField()
