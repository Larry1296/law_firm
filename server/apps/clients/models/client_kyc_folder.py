import uuid

from django.db import models
from django.utils import timezone

from apps.common.models.timestamped_model import TimestampedModel


class ClientKycFolder(TimestampedModel):
    """A KYC (Know Your Customer) folder for a client.

    In Kenyan law practice, when a client delivers documents, the secretary
    opens a KYC folder (e.g. KYC-2026-039 for Mutiso).  Each document the
    client provides gets a sequential sub-reference within that folder:

        KYC-2026-039/D1  → National ID
        KYC-2026-039/D2  → KRA PIN certificate
        KYC-2026-039/D3  → Title deed

    The folder reference and the document index together form the full
    custody reference that staff use to locate the physical document.
    """

    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        CLOSED = "CLOSED", "Closed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey(
        "firm.LawFirm",
        on_delete=models.CASCADE,
        related_name="kyc_folders",
    )
    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="kyc_folders",
    )
    reference = models.CharField(
        max_length=40,
        unique=True,
        db_index=True,
        help_text="e.g. KYC-2026-039",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
    )
    opened_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="opened_kyc_folders",
    )
    opened_at = models.DateTimeField(default=timezone.now)
    closed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    next_document_index = models.PositiveIntegerField(
        default=1,
        help_text="The next /DN index to assign when a document is added.",
    )

    class Meta:
        db_table = "client_kyc_folders"
        ordering = ["-opened_at"]
        indexes = [
            models.Index(fields=["firm", "status"]),
            models.Index(fields=["client", "status"]),
            models.Index(fields=["reference"]),
        ]

    def __str__(self):
        return f"{self.reference} ({self.client.full_name})"

    def allocate_document_index(self):
        """Return the next available document index and increment the counter.

        Call this inside a ``select_for_update`` block when creating a new
        ``ClientDocument`` to avoid race conditions.
        """
        index = self.next_document_index
        self.next_document_index = index + 1
        self.save(update_fields=["next_document_index", "updated_at"])
        return index

    @property
    def document_count(self):
        return self.next_document_index - 1
