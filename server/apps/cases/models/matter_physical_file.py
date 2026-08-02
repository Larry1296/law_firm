import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class MatterPhysicalFile(TimestampedModel):
    class Status(models.TextChoices):
        REQUESTED = "REQUESTED", "Requested"
        AWAITING_PREPARATION = "AWAITING_PREPARATION", "Awaiting Preparation"
        ACTIVE = "ACTIVE", "Active"
        CHECKED_OUT = "CHECKED_OUT", "Checked Out"
        TEMPORARILY_TRANSFERRED = "TEMPORARILY_TRANSFERRED", "Temporarily Transferred"
        CLOSURE_PENDING = "CLOSURE_PENDING", "Closure Pending"
        ARCHIVED = "ARCHIVED", "Archived"
        MISSING = "MISSING", "Missing"
        DESTROYED = "DESTROYED", "Destroyed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="matter_physical_files")
    matter = models.OneToOneField("cases.Case", on_delete=models.PROTECT, related_name="physical_file")
    reference = models.CharField(max_length=80)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.REQUESTED)
    storage_zone = models.CharField(max_length=100, blank=True, default="")
    cabinet = models.CharField(max_length=100, blank=True, default="")
    shelf_or_drawer = models.CharField(max_length=100, blank=True, default="")
    location_detail = models.CharField(max_length=255, blank=True, default="")
    assigned_by = models.ForeignKey("users.User", on_delete=models.PROTECT, null=True, blank=True, related_name="assigned_matter_physical_files")
    assigned_at = models.DateTimeField(null=True, blank=True)
    current_custodian = models.ForeignKey("users.User", on_delete=models.PROTECT, null=True, blank=True, related_name="custodied_matter_physical_files")
    custody_label = models.CharField(max_length=255, blank=True, default="Records room")
    notes = models.TextField(blank=True, default="")
    archived_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "matter_physical_files"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["firm", "reference"], name="unique_matter_physical_file_reference_per_firm"),
        ]
        indexes = [
            models.Index(fields=["firm", "status"]),
            models.Index(fields=["firm", "reference"]),
            models.Index(fields=["current_custodian"]),
        ]

    @property
    def location(self):
        return " / ".join(filter(None, [self.storage_zone, self.cabinet, self.shelf_or_drawer, self.location_detail]))


class MatterPhysicalFileMovement(models.Model):
    class Action(models.TextChoices):
        REQUESTED = "REQUESTED", "Preparation Requested"
        ASSIGNED = "ASSIGNED", "Assigned"
        RELOCATED = "RELOCATED", "Relocated"
        CHECKED_OUT = "CHECKED_OUT", "Checked Out"
        RETURNED = "RETURNED", "Returned"
        TRANSFERRED = "TRANSFERRED", "Transferred"
        MARKED_MISSING = "MARKED_MISSING", "Marked Missing"
        FOUND = "FOUND", "Found"
        SENT_FOR_ARCHIVING = "SENT_FOR_ARCHIVING", "Sent for Archiving"
        ARCHIVED = "ARCHIVED", "Archived"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    physical_file = models.ForeignKey(MatterPhysicalFile, on_delete=models.PROTECT, related_name="movements")
    action = models.CharField(max_length=30, choices=Action.choices)
    previous_status = models.CharField(max_length=32, blank=True, default="")
    new_status = models.CharField(max_length=32)
    previous_location = models.CharField(max_length=500, blank=True, default="")
    new_location = models.CharField(max_length=500, blank=True, default="")
    issued_to = models.ForeignKey("users.User", on_delete=models.PROTECT, null=True, blank=True, related_name="issued_matter_files")
    returned_by = models.ForeignKey("users.User", on_delete=models.PROTECT, null=True, blank=True, related_name="returned_matter_files")
    reason = models.TextField()
    recorded_by = models.ForeignKey("users.User", on_delete=models.PROTECT, related_name="recorded_matter_file_movements")
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "matter_physical_file_movements"
        ordering = ["-recorded_at"]
        indexes = [models.Index(fields=["physical_file", "recorded_at"]), models.Index(fields=["action"])]


class MatterDocumentTransfer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_document = models.ForeignKey("clients.ClientDocument", on_delete=models.PROTECT, related_name="matter_transfers")
    destination_attachment = models.OneToOneField("cases.CaseAttachment", on_delete=models.PROTECT, related_name="custody_transfer")
    previous_reference = models.CharField(max_length=80, blank=True, default="")
    new_reference = models.CharField(max_length=80)
    previous_location = models.CharField(max_length=500, blank=True, default="")
    new_location = models.CharField(max_length=500)
    source_register = models.CharField(max_length=50)
    destination_register = models.CharField(max_length=50)
    reason = models.TextField()
    transferred_by = models.ForeignKey("users.User", on_delete=models.PROTECT, related_name="matter_document_transfers")
    transferred_at = models.DateTimeField(auto_now_add=True)
    receipt_acknowledgement = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        db_table = "matter_document_transfers"
        ordering = ["-transferred_at"]
        indexes = [models.Index(fields=["source_document"]), models.Index(fields=["transferred_at"])]
