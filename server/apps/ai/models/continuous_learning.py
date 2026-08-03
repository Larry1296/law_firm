import hashlib
import uuid

from django.conf import settings
from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class AIConfigurationVersion(TimestampedModel):
    class Kind(models.TextChoices):
        MODEL = "MODEL", "Provider/model"
        PROMPT = "PROMPT", "System prompt"
        RETRIEVAL = "RETRIEVAL", "Retrieval configuration"
        SCORING = "SCORING", "Preparedness scoring"
        PRIORITY = "PRIORITY", "Priority ranking"
        DATASET = "DATASET", "Evaluation dataset"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=20, choices=Kind.choices)
    name = models.CharField(max_length=100)
    version = models.CharField(max_length=50)
    configuration = models.JSONField(default=dict)
    evaluation_results = models.JSONField(default=dict, blank=True)
    meets_thresholds = models.BooleanField(default=False)
    is_active = models.BooleanField(default=False)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "ai_configuration_versions"
        constraints = [models.UniqueConstraint(fields=("kind", "version"), name="unique_ai_configuration_version")]


class KnowledgeIndexEntry(TimestampedModel):
    class Status(models.TextChoices):
        INDEXED = "INDEXED", "Indexed"
        WITHDRAWN = "WITHDRAWN", "Withdrawn"
        FAILED = "FAILED", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_kind = models.CharField(max_length=30)
    source_id = models.UUIDField()
    source_version = models.PositiveIntegerField(default=1)
    content_checksum = models.CharField(max_length=64)
    metadata = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=Status.choices)
    indexed_at = models.DateTimeField(null=True, blank=True)
    error_code = models.CharField(max_length=80, blank=True)

    class Meta:
        db_table = "ai_knowledge_index_entries"
        constraints = [models.UniqueConstraint(fields=("source_kind", "source_id"), name="unique_ai_index_source")]
        indexes = [models.Index(fields=("status", "source_kind"), name="ai_index_status_idx")]

    @staticmethod
    def checksum(content):
        return hashlib.sha256(content.encode("utf-8")).hexdigest()


class AIFindingFeedback(TimestampedModel):
    class Rating(models.TextChoices):
        USEFUL = "USEFUL", "Useful"
        INCORRECT = "INCORRECT", "Incorrect"
        INCOMPLETE = "INCOMPLETE", "Incomplete"
        IRRELEVANT = "IRRELEVANT", "Irrelevant"
        OUTDATED = "OUTDATED", "Outdated"

    class ReviewStatus(models.TextChoices):
        PENDING = "PENDING", "Pending review"
        EVALUATION = "EVALUATION", "Approved for evaluation"
        REJECTED = "REJECTED", "Rejected"
        KNOWLEDGE = "KNOWLEDGE", "Approved for knowledge correction"
        TRAINING = "TRAINING", "Approved for future training dataset"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assessment = models.ForeignKey("ai.AICaseAssessment", on_delete=models.CASCADE, related_name="finding_feedback")
    case = models.ForeignKey("cases.Case", on_delete=models.CASCADE, related_name="ai_finding_feedback")
    finding_key = models.CharField(max_length=160)
    rating = models.CharField(max_length=20, choices=Rating.choices)
    correction = models.TextField(blank=True)
    model_version = models.CharField(max_length=120, blank=True)
    prompt_version = models.CharField(max_length=50)
    retrieval_sources = models.JSONField(default=list)
    submitted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="ai_feedback_submitted")
    review_status = models.CharField(max_length=20, choices=ReviewStatus.choices, default=ReviewStatus.PENDING)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="ai_feedback_reviewed")
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "ai_finding_feedback"


class MatterOutcome(TimestampedModel):
    class Quality(models.TextChoices):
        UNVERIFIED = "UNVERIFIED", "Unverified"
        VERIFIED = "VERIFIED", "Verified"
        EXCLUDED = "EXCLUDED", "Excluded"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.OneToOneField("cases.Case", on_delete=models.CASCADE, related_name="structured_outcome")
    category = models.CharField(max_length=80)
    concluded_on = models.DateField()
    forum = models.CharField(max_length=180, blank=True)
    stage = models.CharField(max_length=120, blank=True)
    amount = models.DecimalField(max_digits=16, decimal_places=2, null=True, blank=True)
    orders = models.JSONField(default=list, blank=True)
    claims = models.JSONField(default=list, blank=True)
    important_factors = models.JSONField(default=list, blank=True)
    material_evidence = models.JSONField(default=list, blank=True)
    procedural_lessons = models.JSONField(default=list, blank=True)
    appeal_filed = models.BooleanField(default=False)
    quality_status = models.CharField(max_length=20, choices=Quality.choices, default=Quality.UNVERIFIED)
    verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    verified_at = models.DateTimeField(null=True, blank=True)
    final_disposition = models.CharField(max_length=40, choices=(("WON", "Won"), ("LOST", "Lost"), ("PARTLY_SUCCESSFUL", "Partly successful"), ("SETTLED", "Settled"), ("WITHDRAWN", "Withdrawn"), ("DISMISSED", "Struck out or dismissed"), ("ABANDONED", "Abandoned"), ("TRANSFERRED", "Transferred"), ("OTHER", "Other")), default="OTHER")
    claim_or_exposure = models.DecimalField(max_digits=16, decimal_places=2, null=True, blank=True)
    settlement_amount = models.DecimalField(max_digits=16, decimal_places=2, null=True, blank=True)
    costs_outcome = models.TextField(blank=True)
    appeal_review_status = models.CharField(max_length=80, blank=True)
    evidence_accepted = models.JSONField(default=list, blank=True)
    evidence_rejected = models.JSONField(default=list, blank=True)
    source_document = models.ForeignKey("cases.CaseAttachment", null=True, blank=True, on_delete=models.SET_NULL, related_name="verified_matter_outcomes")
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="recorded_matter_outcomes")
    exclusion_reason = models.TextField(blank=True)

    class Meta:
        db_table = "ai_matter_outcomes"


class AIEvaluationRun(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    configuration_versions = models.ManyToManyField(AIConfigurationVersion, related_name="evaluation_runs")
    dataset_version = models.CharField(max_length=50)
    metrics = models.JSONField(default=dict)
    passed = models.BooleanField(default=False)
    run_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "ai_evaluation_runs"


class PublicFirmKnowledgePolicy(TimestampedModel):
    """Approval controls for projecting canonical firm data into public knowledge."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.OneToOneField("firm.LawFirm", on_delete=models.CASCADE, related_name="public_knowledge_policy")
    is_published = models.BooleanField(default=False)
    include_description = models.BooleanField(default=True)
    include_owner = models.BooleanField(default=False)
    include_practice_areas = models.BooleanField(default=True)
    include_contact = models.BooleanField(default=False)
    include_location = models.BooleanField(default=False)
    include_hours = models.BooleanField(default=False)
    include_branches = models.BooleanField(default=False)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "ai_public_firm_knowledge_policies"


class PublicAdvocateProfile(TimestampedModel):
    """Explicit opt-in; creating a staff user or lawyer never publishes them."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lawyer = models.OneToOneField("staff.Lawyer", on_delete=models.CASCADE, related_name="public_ai_profile")
    is_published = models.BooleanField(default=False)
    display_name = models.CharField(max_length=180)
    public_bio = models.TextField(blank=True)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "ai_public_advocate_profiles"
