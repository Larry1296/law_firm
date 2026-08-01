import uuid
from django.core.exceptions import ValidationError
from django.db import models

from apps.common.models.timestamped_model import TimestampedModel
from .client import Client


class DocumentType(models.TextChoices):
    IDENTIFICATION = "IDENTIFICATION", "Identification Document"
    REGISTRATION = "REGISTRATION", "Registration Document"
    CONTRACT = "CONTRACT", "Contract"
    COURT_ORDER = "COURT_ORDER", "Court Order"
    EVIDENCE = "EVIDENCE", "Evidence"
    TAX = "TAX", "Tax Document"
    FINANCIAL = "FINANCIAL", "Financial Document"
    LEGAL = "LEGAL", "Legal Document"
    OTHER = "OTHER", "Other"


class ClientDocument(TimestampedModel):

    class Category(models.TextChoices):
        KYC_IDENTITY = "KYC_IDENTITY", "KYC / identity"
        KYC_TAX = "KYC_TAX", "KYC / tax identification"
        CIVIL_STATUS = "CIVIL_STATUS", "Civil status"
        ENTITY_RECORD = "ENTITY_RECORD", "Entity / authority record"
        PROPERTY = "PROPERTY", "Property / land"
        TRANSACTION = "TRANSACTION", "Transaction / commercial"
        MATTER_EVIDENCE = "MATTER_EVIDENCE", "Matter evidence"
        CORRESPONDENCE = "CORRESPONDENCE", "Correspondence"
        MEDICAL = "MEDICAL", "Medical"
        POLICE = "POLICE", "Police / incident"
        OTHER = "OTHER", "Other"

    class Subtype(models.TextChoices):
        NATIONAL_ID = "NATIONAL_ID", "National ID"
        PASSPORT = "PASSPORT", "Passport"
        ALIEN_ID = "ALIEN_ID", "Alien ID / foreign national certificate"
        KRA_PIN = "KRA_PIN", "KRA PIN Certificate"
        BIRTH_CERTIFICATE = "BIRTH_CERTIFICATE", "Birth Certificate"
        MARRIAGE_CERTIFICATE = "MARRIAGE_CERTIFICATE", "Marriage Certificate"
        DEATH_CERTIFICATE = "DEATH_CERTIFICATE", "Death Certificate"
        PROOF_OF_ADDRESS = "PROOF_OF_ADDRESS", "Proof of Address"
        INCORPORATION = "INCORPORATION", "Certificate of Incorporation / Registration"
        CR12 = "CR12", "CR12 / Company Search"
        BUSINESS_REGISTRATION = "BUSINESS_REGISTRATION", "Partnership / Business Registration"
        TRUST_DEED = "TRUST_DEED", "Trust Deed"
        AUTHORITY_TO_INSTRUCT = "AUTHORITY_TO_INSTRUCT", "Authority / Resolution to Instruct Advocates"
        TITLE_DEED = "TITLE_DEED", "Title Deed"
        OFFICIAL_SEARCH = "OFFICIAL_SEARCH", "Official Search"
        SALE_AGREEMENT = "SALE_AGREEMENT", "Sale Agreement"
        CONTRACT = "CONTRACT", "Contract / Agreement"
        INVOICE = "INVOICE", "Invoice"
        RECEIPT = "RECEIPT", "Receipt"
        DELIVERY_NOTE = "DELIVERY_NOTE", "Delivery Note"
        CORRESPONDENCE = "CORRESPONDENCE", "Correspondence"
        MEDICAL_RECORD = "MEDICAL_RECORD", "Medical Record / Report"
        POLICE_ABSTRACT = "POLICE_ABSTRACT", "Police Abstract"
        OTHER = "OTHER", "Other"

    class VerificationStatus(models.TextChoices):
        NOT_VERIFIED = "NOT_VERIFIED", "Not verified"
        VERIFIED = "VERIFIED", "Verified"
        FAILED = "FAILED", "Verification failed"
        EXPIRED = "EXPIRED", "Expired"

    class Confidentiality(models.TextChoices):
        STANDARD = "STANDARD", "Standard confidential"
        RESTRICTED = "RESTRICTED", "Restricted"
        HIGHLY_RESTRICTED = "HIGHLY_RESTRICTED", "Highly restricted"

    class ReviewStatus(models.TextChoices):
        PENDING = "PENDING", "Pending review"
        ACCEPTED = "ACCEPTED", "Accepted"
        NEEDS_REPLACEMENT = "NEEDS_REPLACEMENT", "Replacement required"

    class SourceCopyType(models.TextChoices):
        ORIGINAL_INSPECTED = "ORIGINAL_INSPECTED", "Original inspected and scanned"
        CERTIFIED_COPY = "CERTIFIED_COPY", "Certified copy scanned"
        CLIENT_COPY = "CLIENT_COPY", "Client-supplied copy"
        OFFICIAL_ELECTRONIC = "OFFICIAL_ELECTRONIC", "Official electronic record"

    class ReceivedVia(models.TextChoices):
        CLIENT_PORTAL = "CLIENT_PORTAL", "Client portal"
        IN_PERSON = "IN_PERSON", "Delivered in person"
        EMAIL = "EMAIL", "Email"
        WHATSAPP = "WHATSAPP", "WhatsApp"
        COURIER = "COURIER", "Courier"
        OTHER = "OTHER", "Other"

    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name="documents",
    )

    document_type = models.CharField(
        max_length=50,
        choices=DocumentType.choices,
    )

    title = models.CharField(
        max_length=255,
    )

    description = models.TextField(
        blank=True,
    )

    file = models.FileField(
        upload_to="client_documents/",
        blank=True,
    )
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.CASCADE, related_name="client_documents")

    file_name = models.CharField(
        max_length=255,
        blank=True,
    )

    mime_type = models.CharField(
        max_length=100,
        blank=True,
    )

    reference = models.CharField(max_length=80, blank=True, db_index=True)
    category = models.CharField(max_length=40, choices=Category.choices, default=Category.OTHER)
    subtype = models.CharField(max_length=50, choices=Subtype.choices, default=Subtype.OTHER)
    document_owner_subject = models.CharField(max_length=255, blank=True, default="")
    document_identifier = models.CharField(max_length=255, blank=True, default="")
    issuing_authority = models.CharField(max_length=255, blank=True, default="")
    document_date = models.DateField(null=True, blank=True)
    issue_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    page_count = models.PositiveIntegerField(default=1)
    return_required = models.BooleanField(default=False)
    expected_return_date = models.DateField(null=True, blank=True)
    visible_damage_or_alteration = models.BooleanField(default=False)
    condition_description = models.TextField(blank=True, default="")
    confidentiality_level = models.CharField(max_length=30, choices=Confidentiality.choices, default=Confidentiality.STANDARD)
    verification_status = models.CharField(max_length=30, choices=VerificationStatus.choices, default=VerificationStatus.NOT_VERIFIED)
    verification_method = models.CharField(max_length=255, blank=True, default="")
    verified_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="verified_client_document_records")
    verified_at = models.DateTimeField(null=True, blank=True)
    digital_copy_available = models.BooleanField(default=False)
    electronic_file_hash = models.CharField(max_length=128, blank=True, default="")
    electronic_file_size = models.PositiveBigIntegerField(null=True, blank=True)
    created_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="created_client_document_records")
    updated_by = models.ForeignKey("users.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="updated_client_document_records")
    archived_at = models.DateTimeField(null=True, blank=True)

    review_status = models.CharField(
        max_length=30,
        choices=ReviewStatus.choices,
        default=ReviewStatus.PENDING,
    )

    review_notes = models.TextField(blank=True, default="")

    source_reference = models.CharField(max_length=255, blank=True, default="")
    source_copy_type = models.CharField(
        max_length=30, choices=SourceCopyType.choices, default=SourceCopyType.CLIENT_COPY
    )
    physical_copy_retained = models.BooleanField(default=False)
    physical_storage_location = models.CharField(max_length=255, blank=True, default="")
    custody_notes = models.TextField(blank=True, default="")
    received_via = models.CharField(
        max_length=30, choices=ReceivedVia.choices, default=ReceivedVia.CLIENT_PORTAL
    )

    received_from = models.CharField(max_length=255, blank=True, default="")
    received_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="received_physical_client_documents",
    )
    received_at = models.DateTimeField(null=True, blank=True)

    uploaded_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_client_documents",
    )

    is_verified = models.BooleanField(
        default=False,
    )

    is_confidential = models.BooleanField(
        default=True,
    )
    is_client_visible = models.BooleanField(default=False)

    class Meta:
        db_table = "client_documents"
        verbose_name = "Client Document"
        verbose_name_plural = "Client Documents"
        indexes = [
            models.Index(fields=["client", "document_type"]),
            models.Index(fields=["firm", "reference"]),
            models.Index(fields=["client", "subtype"]),
        ]
        constraints = [models.UniqueConstraint(
            fields=["firm", "reference"], condition=~models.Q(reference=""),
            name="unique_client_document_reference_per_firm"
        )]

    def __str__(self):
        return f"{self.reference} — {self.title}"

    def clean(self):
        if self.client_id and self.firm_id and self.client.firm_id != self.firm_id:
            raise ValidationError("The document firm must match the client's firm.")
        if self.return_required and not self.expected_return_date:
            raise ValidationError({"expected_return_date": "Record the expected return date."})
        if self.page_count < 1:
            raise ValidationError({"page_count": "Page count must be at least one."})

    def save(self, *args, **kwargs):
        if not self.file_name and self.file:
            self.file_name = self.file.name.rsplit("/", 1)[-1]
        super().save(*args, **kwargs)


class ClientDocumentReferenceSequence(models.Model):
    client = models.OneToOneField(Client, on_delete=models.CASCADE, primary_key=True, related_name="document_reference_sequence")
    next_number = models.PositiveIntegerField(default=1)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "client_document_reference_sequences"


class ClientDocumentReferenceCorrection(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(ClientDocument, on_delete=models.PROTECT, related_name="reference_corrections")
    previous_reference = models.CharField(max_length=80)
    corrected_reference = models.CharField(max_length=80)
    reason = models.TextField()
    corrected_by = models.ForeignKey("users.User", on_delete=models.PROTECT, related_name="client_document_reference_corrections")

    class Meta:
        db_table = "client_document_reference_corrections"
        ordering = ["-created_at"]


class ClientDocumentCustodyMovement(TimestampedModel):
    class MovementType(models.TextChoices):
        RECEIVED = "RECEIVED", "Received"
        TRANSFER = "TRANSFER", "Internal transfer"
        CHECK_OUT = "CHECK_OUT", "Checked out"
        RETURN = "RETURN", "Returned"
        RELEASE = "RELEASE", "Released externally"
        SECURE_STORAGE = "SECURE_STORAGE", "Moved to secure storage"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(ClientDocument, on_delete=models.PROTECT, related_name="custody_movements")
    from_location_or_custodian = models.CharField(max_length=255, blank=True, default="")
    to_location_or_custodian = models.CharField(max_length=255)
    movement_type = models.CharField(max_length=30, choices=MovementType.choices)
    released_by = models.ForeignKey("users.User", on_delete=models.PROTECT, related_name="released_document_movements")
    received_by = models.ForeignKey("users.User", on_delete=models.PROTECT, related_name="received_document_movements")
    moved_at = models.DateTimeField()
    purpose = models.TextField()
    expected_return_at = models.DateTimeField(null=True, blank=True)
    actual_return_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "client_document_custody_movements"
        ordering = ["-moved_at", "-created_at"]
