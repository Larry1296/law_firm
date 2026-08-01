import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class MatterDocumentReference(TimestampedModel):
    class Purpose(models.TextChoices):
        CLIENT_INSTRUCTION = "CLIENT_INSTRUCTION", "Client instruction"
        EVIDENCE = "EVIDENCE", "Evidence"
        CORRESPONDENCE = "CORRESPONDENCE", "Correspondence"
        DEMAND_LETTER = "DEMAND_LETTER", "Demand letter"
        PLEADING = "PLEADING", "Pleading"
        COURT_DOCUMENT = "COURT_DOCUMENT", "Court document"
        OTHER = "OTHER", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey("cases.Case", on_delete=models.CASCADE, related_name="document_references")
    document = models.ForeignKey(
        "clients.ClientDocument", on_delete=models.CASCADE, related_name="matter_references"
    )
    purpose = models.CharField(max_length=40, choices=Purpose.choices, default=Purpose.OTHER)
    notes = models.TextField(blank=True, default="")
    referenced_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="matter_document_references"
    )
    originating_proposed_reference = models.ForeignKey(
        "documents.ProposedMatterDocumentReference", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="carried_matter_references",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "matter_document_references"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["case", "document"], name="unique_document_reference_per_matter")
        ]

    def clean(self):
        if self.case_id and self.document_id:
            if self.case.client_id != self.document.client_id:
                raise ValidationError("A matter may only reference documents belonging to its client.")
            if self.case.firm_id != self.document.firm_id:
                raise ValidationError("A matter may only reference documents belonging to its firm.")


class ProposedMatterDocumentReference(TimestampedModel):
    class RequiredStatus(models.TextChoices):
        REQUIRED = "REQUIRED", "Required"
        OPTIONAL = "OPTIONAL", "Optional"
        SUPPORTING = "SUPPORTING", "Supporting record"

    class ReviewStatus(models.TextChoices):
        NOT_REVIEWED = "NOT_REVIEWED", "Not reviewed"
        SUFFICIENT = "SUFFICIENT", "Sufficient"
        INSUFFICIENT = "INSUFFICIENT", "Insufficient"
        REPLACEMENT_REQUIRED = "REPLACEMENT_REQUIRED", "Replacement required"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proposed_matter = models.ForeignKey(
        "clients.ClientMatterConflictCheck", on_delete=models.PROTECT, related_name="document_references"
    )
    document = models.ForeignKey(
        "clients.ClientDocument", on_delete=models.PROTECT, related_name="proposed_matter_references"
    )
    purpose = models.CharField(max_length=255)
    relevance_notes = models.TextField(blank=True, default="")
    referenced_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="proposed_document_references"
    )
    required_status = models.CharField(max_length=20, choices=RequiredStatus.choices, default=RequiredStatus.SUPPORTING)
    review_status = models.CharField(max_length=30, choices=ReviewStatus.choices, default=ReviewStatus.NOT_REVIEWED)
    is_active = models.BooleanField(default=True)
    removed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True,
        related_name="removed_proposed_document_references",
    )
    removed_at = models.DateTimeField(null=True, blank=True)
    removal_reason = models.TextField(blank=True, default="")

    class Meta:
        db_table = "proposed_matter_document_references"
        ordering = ["created_at"]
        constraints = [models.UniqueConstraint(fields=["proposed_matter", "document"], name="unique_document_reference_per_proposed_matter")]

    def clean(self):
        if self.proposed_matter_id and self.document_id:
            if self.proposed_matter.client_id != self.document.client_id:
                raise ValidationError("A proposed matter may only reference its client's documents.")
            if self.proposed_matter.firm_id != self.document.firm_id:
                raise ValidationError("A proposed matter may only reference its firm's documents.")


class PhysicalDocumentReceipt(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="physical_document_receipts")
    client = models.ForeignKey("clients.Client", on_delete=models.PROTECT, related_name="document_receipts")
    receipt_number = models.CharField(max_length=60)
    received_from = models.CharField(max_length=255)
    received_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="issued_document_receipts")
    received_at = models.DateTimeField()
    firm_details_snapshot = models.JSONField(default=dict)
    kyc_reference_snapshot = models.CharField(max_length=40)

    class Meta:
        db_table = "physical_document_receipts"
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["firm", "receipt_number"], name="unique_physical_receipt_per_firm")]


class PhysicalDocumentReceiptSequence(models.Model):
    firm = models.OneToOneField("firm.LawFirm", on_delete=models.CASCADE, primary_key=True, related_name="physical_receipt_sequence")
    year = models.PositiveIntegerField()
    next_number = models.PositiveIntegerField(default=1)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "physical_document_receipt_sequences"


class PhysicalDocumentReceiptItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    receipt = models.ForeignKey(PhysicalDocumentReceipt, on_delete=models.PROTECT, related_name="items")
    document = models.ForeignKey("clients.ClientDocument", on_delete=models.PROTECT, related_name="receipt_items")
    document_reference_snapshot = models.CharField(max_length=80)
    title_snapshot = models.CharField(max_length=255)
    subtype_snapshot = models.CharField(max_length=50)
    copy_type_snapshot = models.CharField(max_length=30)
    page_count_snapshot = models.PositiveIntegerField()
    condition_snapshot = models.TextField(blank=True, default="")
    return_required_snapshot = models.BooleanField(default=False)

    class Meta:
        db_table = "physical_document_receipt_items"
        constraints = [models.UniqueConstraint(fields=["receipt", "document"], name="unique_document_per_receipt")]


class DocumentRequirementTemplate(TimestampedModel):
    class Stage(models.TextChoices):
        PROSPECTIVE_KYC = "PROSPECTIVE_KYC", "Prospective client / KYC"
        PROPOSED_MATTER = "PROPOSED_MATTER", "Proposed matter"
        CONFLICT_CHECK = "CONFLICT_CHECK", "Conflict check"
        FIRM_ACCEPTANCE = "FIRM_ACCEPTANCE", "Firm acceptance"
        MATTER_OPENING = "MATTER_OPENING", "Matter opening"
        PRE_FILING = "PRE_FILING", "Pre-filing"
        FILING = "FILING", "Filing"
        HEARING = "HEARING", "Hearing"
        CLOSURE = "CLOSURE", "Closure"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.CASCADE, related_name="document_requirement_templates")
    name = models.CharField(max_length=255)
    stage = models.CharField(max_length=30, choices=Stage.choices)
    document_category = models.CharField(max_length=40, blank=True, default="")
    document_subtype = models.CharField(max_length=50, blank=True, default="")
    client_type = models.CharField(max_length=50, blank=True, default="")
    practice_area = models.CharField(max_length=100, blank=True, default="")
    matter_nature = models.CharField(max_length=100, blank=True, default="")
    forum = models.CharField(max_length=100, blank=True, default="")
    procedure = models.CharField(max_length=100, blank=True, default="")
    is_required = models.BooleanField(default=True)
    notes = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "document_requirement_templates"
        ordering = ["stage", "name"]


class DocumentRequirement(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(DocumentRequirementTemplate, on_delete=models.PROTECT, related_name="instances")
    client = models.ForeignKey("clients.Client", on_delete=models.PROTECT, related_name="document_requirements")
    proposed_matter = models.ForeignKey("clients.ClientMatterConflictCheck", on_delete=models.CASCADE, null=True, blank=True, related_name="document_requirements")
    case = models.ForeignKey("cases.Case", on_delete=models.CASCADE, null=True, blank=True, related_name="document_requirements")
    selected_document = models.ForeignKey("clients.ClientDocument", on_delete=models.PROTECT, null=True, blank=True, related_name="satisfied_requirements")
    notes = models.TextField(blank=True, default="")
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_document_requirements")
    is_client_visible = models.BooleanField(default=False)

    class Meta:
        db_table = "document_requirements"
        constraints = [
            models.UniqueConstraint(
                fields=["template", "proposed_matter"],
                condition=models.Q(proposed_matter__isnull=False),
                name="unique_template_per_proposed_matter",
            ),
            models.UniqueConstraint(
                fields=["template", "case"], condition=models.Q(case__isnull=False),
                name="unique_template_per_matter",
            ),
        ]

    def clean(self):
        if self.selected_document_id and self.selected_document.client_id != self.client_id:
            raise ValidationError("A requirement can only be satisfied by this client's document.")
        if self.template_id and self.template.firm_id != self.client.firm_id:
            raise ValidationError("The requirement template and client must belong to the same firm.")
        if self.proposed_matter_id and self.proposed_matter.client_id != self.client_id:
            raise ValidationError("The proposed-matter requirement belongs to another client.")
        if self.case_id and self.case.client_id != self.client_id:
            raise ValidationError("The matter requirement belongs to another client.")
