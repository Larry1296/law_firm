import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class LegalSourceDocument(TimestampedModel):
    class SourceType(models.TextChoices):
        CONSTITUTION = "constitution", "Constitution"
        STATUTE = "statute", "Statute"
        REGULATION = "regulation", "Regulation"
        DECISION = "decision", "Judicial decision"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=300)
    slug = models.SlugField(max_length=320, unique=True)
    jurisdiction = models.CharField(max_length=120, default="Kenya")
    source_type = models.CharField(max_length=30, choices=SourceType.choices)
    official_url = models.URLField(max_length=500)
    effective_date = models.DateField(null=True, blank=True)
    version_date = models.DateField(null=True, blank=True)
    imported_at = models.DateTimeField(null=True, blank=True)
    last_verified_at = models.DateField(null=True, blank=True)
    source_checksum = models.CharField(max_length=64)
    is_official_primary_source = models.BooleanField(default=False)
    is_published = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "legal_source_documents"
        ordering = ("title",)

    def __str__(self):
        return self.title


class LegalProvision(TimestampedModel):
    class UnitType(models.TextChoices):
        PREAMBLE = "preamble", "Preamble"
        ARTICLE = "article", "Article"
        SCHEDULE = "schedule", "Schedule"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(LegalSourceDocument, on_delete=models.CASCADE, related_name="provisions")
    unit_type = models.CharField(max_length=20, choices=UnitType.choices)
    stable_key = models.CharField(max_length=100)
    chapter = models.CharField(max_length=240, blank=True)
    part = models.CharField(max_length=240, blank=True)
    article_number = models.CharField(max_length=30, blank=True)
    heading = models.CharField(max_length=300, blank=True)
    clauses = models.JSONField(default=list, blank=True)
    text = models.TextField()
    checksum = models.CharField(max_length=64)
    display_order = models.PositiveIntegerField(default=0)
    is_published = models.BooleanField(default=False)

    class Meta:
        db_table = "legal_provisions"
        ordering = ("display_order",)
        constraints = [models.UniqueConstraint(fields=("document", "stable_key"), name="unique_legal_provision_key")]
        indexes = [models.Index(fields=("is_published", "article_number"), name="legal_provision_public_idx")]

    def __str__(self):
        return f"{self.document.title}: {self.stable_key}"
