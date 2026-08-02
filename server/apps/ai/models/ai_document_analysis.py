import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class AIDocumentAnalysis(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assessment = models.ForeignKey("ai.AICaseAssessment", on_delete=models.CASCADE, related_name="document_analyses")
    document = models.ForeignKey("cases.CaseAttachment", on_delete=models.PROTECT, related_name="ai_document_analyses")
    extraction_status = models.CharField(max_length=30)
    detected_type = models.CharField(max_length=100, blank=True)
    page_count = models.PositiveIntegerField(null=True, blank=True)
    extraction_quality = models.CharField(max_length=20, default="UNKNOWN")
    extracted_facts = models.JSONField(default=dict)
    inconsistencies = models.JSONField(default=list)
    evidence_gaps = models.JSONField(default=list)
    page_citations = models.JSONField(default=list)
    checksum = models.CharField(max_length=64, blank=True)
    authenticity_verified = models.BooleanField(default=False)

    class Meta:
        db_table = "ai_document_analyses"
        constraints = [models.UniqueConstraint(fields=("assessment", "document"), name="unique_assessment_document_analysis")]
