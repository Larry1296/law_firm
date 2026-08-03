import uuid

from django.conf import settings
from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class AICaseAssessment(TimestampedModel):
    class Priority(models.TextChoices):
        CRITICAL = "CRITICAL", "Critical"
        HIGH = "HIGH", "High"
        MEDIUM = "MEDIUM", "Medium"
        LOW = "LOW", "Low"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey("cases.Case", on_delete=models.CASCADE, related_name="ai_assessments")
    version = models.PositiveIntegerField()
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="requested_ai_case_assessments")
    priority = models.CharField(max_length=20, choices=Priority.choices)
    component_scores = models.JSONField(default=dict)
    component_reasons = models.JSONField(default=dict)
    alerts = models.JSONField(default=list)
    gaps = models.JSONField(default=list)
    recommendations = models.JSONField(default=list)
    preparedness = models.JSONField(default=dict)
    legal_analysis = models.JSONField(default=dict)
    outcome_scenarios = models.JSONField(default=list)
    comparable_matters = models.JSONField(default=dict)
    case_snapshot = models.JSONField(default=dict)
    proceeding_snapshot = models.JSONField(default=list)
    document_snapshot = models.JSONField(default=list)
    included_documents = models.ManyToManyField("cases.CaseAttachment", blank=True, related_name="ai_assessments")
    retrieved_provisions = models.ManyToManyField("ai.LegalProvision", blank=True, related_name="case_assessments")
    confidence = models.CharField(max_length=20, default="LOW")
    limitations = models.JSONField(default=list)
    model = models.CharField(max_length=120, blank=True)
    prompt_version = models.CharField(max_length=40, default="case-assessment-v1")
    scoring_version = models.CharField(max_length=40, default="priority-v1")
    source_version = models.CharField(max_length=64, blank=True)
    model_version = models.CharField(max_length=50, default="configured-model-v1")
    retrieval_version = models.CharField(max_length=50, default="knowledge-retrieval-v1")
    priority_version = models.CharField(max_length=50, default="priority-v1")
    knowledge_index_version = models.CharField(max_length=64, blank=True)
    change_summary = models.JSONField(default=dict, blank=True)
    analyzed_at = models.DateTimeField()
    source_state_at = models.DateTimeField()
    is_stale = models.BooleanField(default=False)
    status = models.CharField(max_length=30, default="COMPLETED")

    class Meta:
        db_table = "ai_case_assessments"
        ordering = ("-version",)
        constraints = [models.UniqueConstraint(fields=("case", "version"), name="unique_case_assessment_version")]
        indexes = [models.Index(fields=("case", "is_stale", "analyzed_at"), name="ai_case_current_idx")]


class AIAssessmentAudit(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="ai_assessment_audits")
    case = models.ForeignKey("cases.Case", on_delete=models.CASCADE, related_name="ai_audit_entries")
    assessment = models.ForeignKey(AICaseAssessment, null=True, blank=True, on_delete=models.SET_NULL, related_name="audit_entries")
    action = models.CharField(max_length=60)
    document_ids = models.JSONField(default=list, blank=True)
    source_ids = models.JSONField(default=list, blank=True)
    provider = models.CharField(max_length=80, blank=True)
    model = models.CharField(max_length=120, blank=True)
    result_status = models.CharField(max_length=30)

    class Meta:
        db_table = "ai_assessment_audits"
        ordering = ("-created_at",)


class AIAssessmentRecommendation(TimestampedModel):
    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        IN_PROGRESS = "IN_PROGRESS", "In progress"
        COMPLETED = "COMPLETED", "Completed"
        DISMISSED = "DISMISSED", "Dismissed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey("cases.Case", on_delete=models.CASCADE, related_name="ai_recommendations")
    created_assessment = models.ForeignKey(AICaseAssessment, on_delete=models.PROTECT, related_name="structured_recommendations")
    category = models.CharField(max_length=60)
    action = models.TextField()
    reason = models.TextField(blank=True)
    support = models.JSONField(default=list, blank=True)
    priority = models.CharField(max_length=20, choices=AICaseAssessment.Priority.choices, default=AICaseAssessment.Priority.MEDIUM)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    responsible_person = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="ai_recommendations")
    due_date = models.DateField(null=True, blank=True)
    advocate_response = models.TextField(blank=True)
    completion_note = models.TextField(blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="completed_ai_recommendations")

    class Meta:
        db_table = "ai_assessment_recommendations"
        indexes = [models.Index(fields=("case", "status", "priority"), name="ai_rec_case_status_idx")]


class AIEventImpact(TimestampedModel):
    class Direction(models.TextChoices):
        IMPROVING = "IMPROVING", "Improving"
        STABLE = "STABLE", "Stable"
        DETERIORATING = "DETERIORATING", "Deteriorating"
        INSUFFICIENT = "INSUFFICIENT_DATA", "Insufficient data"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey("cases.Case", on_delete=models.CASCADE, related_name="ai_event_impacts")
    triggering_event = models.ForeignKey("cases.CaseEvent", on_delete=models.PROTECT, related_name="ai_impacts")
    previous_assessment = models.ForeignKey(AICaseAssessment, on_delete=models.PROTECT, related_name="impacts_as_previous")
    new_assessment = models.OneToOneField(AICaseAssessment, on_delete=models.PROTECT, related_name="event_impact")
    preparedness_delta = models.SmallIntegerField(default=0)
    procedural_risk_delta = models.SmallIntegerField(default=0)
    evidence_readiness_delta = models.SmallIntegerField(default=0)
    legal_preparedness_delta = models.SmallIntegerField(default=0)
    outlook_delta = models.SmallIntegerField(null=True, blank=True)
    confidence_delta = models.SmallIntegerField(default=0)
    direction = models.CharField(max_length=24, choices=Direction.choices)
    positive_factors = models.JSONField(default=list, blank=True)
    negative_factors = models.JSONField(default=list, blank=True)
    unchanged_factors = models.JSONField(default=list, blank=True)
    explanation = models.TextField()
    source_records = models.JSONField(default=list)
    limitations = models.JSONField(default=list)
    model_version = models.CharField(max_length=50)
    scoring_version = models.CharField(max_length=50)
    generated_at = models.DateTimeField()

    class Meta:
        db_table = "ai_event_impacts"
        constraints = [models.UniqueConstraint(fields=("triggering_event", "previous_assessment"), name="unique_verified_event_impact")]
