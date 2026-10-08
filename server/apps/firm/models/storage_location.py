import uuid

from django.core.exceptions import ValidationError
from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class StorageLocation(TimestampedModel):
    """A labelled place in the firm's records room, mirroring the physical one.

    The firm lays out its rooms, the cabinets and safes in them, and the drawers
    or shelves inside those, using the labels painted on the real furniture.
    KYC files and matter files are then placed in a drawer or shelf, so the
    system always knows where the paper is: "Registry › Cabinet B › Drawer 3".
    The system holds no document files, only these references.
    """

    class Kind(models.TextChoices):
        ROOM = "ROOM", "Room"
        CABINET = "CABINET", "Cabinet"
        SAFE = "SAFE", "Safe / strongroom"
        DRAWER = "DRAWER", "Drawer"
        SHELF = "SHELF", "Shelf"

    class Purpose(models.TextChoices):
        KYC = "KYC", "Client KYC files"
        MATTER = "MATTER", "Matter files"
        ORIGINALS = "ORIGINALS", "Valuable originals"
        ARCHIVE = "ARCHIVE", "Closed and archived files"
        GENERAL = "GENERAL", "General"

    # Which kinds may sit inside which: rooms hold cabinets and safes, which hold drawers and shelves.
    ALLOWED_PARENTS = {
        Kind.ROOM: {None},
        Kind.CABINET: {Kind.ROOM},
        Kind.SAFE: {Kind.ROOM},
        Kind.DRAWER: {Kind.CABINET, Kind.SAFE},
        Kind.SHELF: {Kind.ROOM, Kind.CABINET, Kind.SAFE},
    }
    # Where files are actually placed.
    FILING_KINDS = {Kind.DRAWER, Kind.SHELF, Kind.SAFE}

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.CASCADE, related_name="storage_locations")
    parent = models.ForeignKey("self", on_delete=models.PROTECT, null=True, blank=True, related_name="children")
    kind = models.CharField(max_length=10, choices=Kind.choices)
    label = models.CharField(max_length=80, help_text="As written on the physical room, cabinet, drawer or shelf.")
    purpose = models.CharField(max_length=10, choices=Purpose.choices, default=Purpose.GENERAL)
    sort_order = models.PositiveIntegerField(default=0)
    notes = models.CharField(max_length=255, blank=True, default="")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "firm_storage_locations"
        ordering = ["sort_order", "label"]
        constraints = [
            models.UniqueConstraint(fields=["firm", "parent", "label"], name="unique_storage_label_per_parent"),
            models.UniqueConstraint(
                fields=["firm", "label"], condition=models.Q(parent__isnull=True), name="unique_storage_room_label",
            ),
        ]

    def __str__(self):
        return self.path

    @property
    def path(self):
        parts, node = [], self
        while node is not None:
            parts.append(node.label)
            node = node.parent
        return " › ".join(reversed(parts))

    def clean(self):
        parent_kind = self.parent.kind if self.parent_id else None
        if parent_kind not in self.ALLOWED_PARENTS[self.kind]:
            where = f"inside a {self.parent.get_kind_display().lower()}" if self.parent_id else "on its own"
            raise ValidationError({"parent": f"A {self.get_kind_display().lower()} cannot be placed {where}."})
        if self.parent_id and self.parent.firm_id != self.firm_id:
            raise ValidationError({"parent": "The parent location belongs to another firm."})
        node = self.parent
        while node is not None:
            if node.pk == self.pk:
                raise ValidationError({"parent": "A location cannot be placed inside itself."})
            node = node.parent
