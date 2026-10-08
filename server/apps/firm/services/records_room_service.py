"""The firm's records room: its physical layout, file numbers and where each paper is.

Sheria Master stores no document files. It mirrors the paper system a Kenyan
firm already runs: each client has a KYC file (KYC-2026-039) whose documents
are numbered inside it (KYC-2026-039/D1), each matter has its own file, and
files sit in labelled drawers and shelves. These helpers keep those references
consistent so staff, clients and the assistants can always say where a paper is.
"""
from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.firm.models import StorageLocation

KYC_PREFIX = "KYC"


def location_or_error(firm, location_id, *, purposes=None):
    """A filing place (drawer, shelf or safe) of this firm, active and fit for the purpose."""
    if not location_id:
        return None
    try:
        location = StorageLocation.objects.select_related("parent__parent").get(id=location_id, firm=firm, is_active=True)
    except (StorageLocation.DoesNotExist, ValueError, TypeError, Exception) as exc:
        raise ValidationError({"location_id": "Choose a drawer, shelf or safe from the firm's records room."}) from exc
    if location.kind not in StorageLocation.FILING_KINDS:
        raise ValidationError({"location_id": "Files go in a drawer, shelf or safe, not directly in a room or cabinet."})
    if purposes and location.purpose not in set(purposes) | {StorageLocation.Purpose.GENERAL}:
        raise ValidationError({"location_id": f"{location.path} is set aside for {location.get_purpose_display().lower()}."})
    return location


class RecordsRoomService:
    # ---------------------------------------------------------------- layout

    @staticmethod
    def serialize(location, counts=None):
        counts = counts or {}
        return {
            "id": str(location.id),
            "parent_id": str(location.parent_id) if location.parent_id else None,
            "kind": location.kind,
            "kind_label": location.get_kind_display(),
            "label": location.label,
            "path": location.path,
            "purpose": location.purpose,
            "purpose_label": location.get_purpose_display(),
            "sort_order": location.sort_order,
            "notes": location.notes,
            "is_active": location.is_active,
            "is_filing_place": location.kind in StorageLocation.FILING_KINDS,
            "kyc_files": counts.get("kyc", 0),
            "matter_files": counts.get("matter", 0),
            "documents_held": counts.get("held", 0),
        }

    @classmethod
    def layout(cls, firm, *, include_inactive=True):
        """Every location as a flat list in tree order, each with how many files it holds."""
        locations = StorageLocation.objects.filter(firm=firm).select_related("parent__parent").annotate(
            kyc=Count("kyc_files", distinct=True),
            matter=Count("matter_files", distinct=True),
            held=Count("held_client_documents", filter=Q(held_client_documents__archived_at__isnull=True), distinct=True),
        )
        if not include_inactive:
            locations = locations.filter(is_active=True)
        by_parent = {}
        for location in locations:
            by_parent.setdefault(location.parent_id, []).append(location)
        ordered = []

        def walk(parent_id, depth):
            for location in sorted(by_parent.get(parent_id, []), key=lambda item: (item.sort_order, item.label.lower())):
                item = cls.serialize(location, {"kyc": location.kyc, "matter": location.matter, "held": location.held})
                item["depth"] = depth
                ordered.append(item)
                walk(location.id, depth + 1)

        walk(None, 0)
        return {
            "locations": ordered,
            "kinds": [{"value": value, "label": label} for value, label in StorageLocation.Kind.choices],
            "purposes": [{"value": value, "label": label} for value, label in StorageLocation.Purpose.choices],
            "allowed_parents": {kind: sorted(parent or "" for parent in parents) for kind, parents in StorageLocation.ALLOWED_PARENTS.items()},
        }

    @staticmethod
    def filing_places(firm, purposes=None):
        """Active drawers, shelves and safes to choose from when filing."""
        places = StorageLocation.objects.filter(firm=firm, is_active=True, kind__in=StorageLocation.FILING_KINDS).select_related("parent__parent")
        if purposes:
            places = places.filter(purpose__in=set(purposes) | {StorageLocation.Purpose.GENERAL})
        return sorted(
            ({"id": str(place.id), "path": place.path, "kind": place.kind, "purpose": place.purpose} for place in places),
            key=lambda item: item["path"].lower(),
        )

    @staticmethod
    def _apply(location, data):
        for field in ("label", "notes"):
            if field in data:
                setattr(location, field, (data.get(field) or "").strip())
        if "purpose" in data:
            if data["purpose"] not in StorageLocation.Purpose.values:
                raise ValidationError({"purpose": "Choose what this place holds."})
            location.purpose = data["purpose"]
        if "sort_order" in data:
            try:
                location.sort_order = max(0, int(data["sort_order"]))
            except (TypeError, ValueError) as exc:
                raise ValidationError({"sort_order": "Use a whole number."}) from exc
        if not location.label:
            raise ValidationError({"label": "Write the label shown on the physical room, cabinet, drawer or shelf."})

    @classmethod
    @transaction.atomic
    def create(cls, firm, data):
        kind = data.get("kind")
        if kind not in StorageLocation.Kind.values:
            raise ValidationError({"kind": "Choose a room, cabinet, safe, drawer or shelf."})
        parent = None
        if data.get("parent_id"):
            try:
                parent = StorageLocation.objects.get(id=data["parent_id"], firm=firm, is_active=True)
            except (StorageLocation.DoesNotExist, ValueError, TypeError, Exception) as exc:
                raise ValidationError({"parent_id": "Choose where this sits in the records room."}) from exc
        location = StorageLocation(firm=firm, parent=parent, kind=kind)
        if parent and "purpose" not in data:
            location.purpose = parent.purpose
        cls._apply(location, data)
        cls._save(location)
        return cls.serialize(location)

    @classmethod
    @transaction.atomic
    def update(cls, firm, location_id, data):
        location = StorageLocation.objects.select_for_update().get(id=location_id, firm=firm)
        cls._apply(location, data)
        if "is_active" in data:
            active = str(data["is_active"]).lower() in {"true", "1", "yes", "on"}
            if not active and cls._holds_anything(location):
                raise ValidationError({"is_active": "Move the files out of this place before retiring it."})
            location.is_active = active
        cls._save(location)
        return cls.serialize(location)

    @staticmethod
    def _holds_anything(location):
        places = [location]
        frontier = [location]
        while frontier:
            children = list(StorageLocation.objects.filter(parent__in=frontier, is_active=True))
            places += children
            frontier = children
        return (
            any(place.kyc_files.exists() or place.matter_files.exists() for place in places)
            or any(place.held_client_documents.filter(archived_at__isnull=True).exists() for place in places)
        )

    @staticmethod
    def _save(location):
        from django.core.exceptions import ValidationError as ModelValidationError

        try:
            location.full_clean(exclude=["firm"])
            location.save()
        except ModelValidationError as exc:
            raise ValidationError(exc.message_dict) from exc
        except IntegrityError as exc:
            raise ValidationError({"label": "Another place here already has that label."}) from exc

    # ---------------------------------------------------------------- KYC file numbers

    @staticmethod
    def _taken(firm, reference):
        from apps.clients.models import Client

        return Client.objects.filter(firm=firm, kyc_drawer_reference=reference).exists()

    @classmethod
    def preview_kyc_reference(cls, firm):
        """The number the next KYC file will get, without reserving it."""
        from apps.clients.models import KYCFileSequence

        year = timezone.localdate().year
        sequence = KYCFileSequence.objects.filter(firm=firm, year=year).first()
        number = sequence.next_number if sequence else 1
        while cls._taken(firm, f"{KYC_PREFIX}-{year}-{number:03d}"):
            number += 1
        return f"{KYC_PREFIX}-{year}-{number:03d}"

    @classmethod
    def allocate_kyc_reference(cls, firm):
        """Reserve the next KYC file number for this firm and year. Call inside a transaction."""
        from apps.clients.models import KYCFileSequence

        year = timezone.localdate().year
        KYCFileSequence.objects.get_or_create(firm=firm, year=year)
        sequence = KYCFileSequence.objects.select_for_update().get(firm=firm, year=year)
        while True:
            reference = f"{KYC_PREFIX}-{year}-{sequence.next_number:03d}"
            sequence.next_number += 1
            if not cls._taken(firm, reference):
                sequence.save(update_fields=["next_number"])
                return reference

    # ---------------------------------------------------------------- where a paper is

    @staticmethod
    def _custody(document):
        movement = document.custody_movements.select_related("received_by").order_by("-moved_at", "-created_at").first()
        if not movement:
            return None
        if movement.movement_type == movement.MovementType.CHECK_OUT and not movement.actual_return_at:
            return f"checked out to {movement.received_by.full_name} since {timezone.localtime(movement.moved_at):%d %b %Y}"
        if movement.movement_type == movement.MovementType.RELEASE:
            return f"released to {movement.to_location_or_custodian} on {timezone.localtime(movement.moved_at):%d %b %Y}"
        return None

    @classmethod
    def where_is(cls, document, *, include_position=True):
        """Where a client document's paper is, for staff screens and the assistants.

        include_position=False leaves out the room, cabinet and drawer, for clients.
        """
        client = document.client
        in_file, position = "", ""
        if document.held_in_id:
            position = document.held_in.path
        elif document.classification == document.Classification.CLIENT_KYC:
            in_file = client.kyc_drawer_reference or ""
            position = client.kyc_location.path if client.kyc_location_id else client.kyc_cabinet_location
        else:
            reference = next(iter(document.matter_references.all()), None)
            physical_file = getattr(reference.case, "physical_file", None) if reference else None
            if physical_file:
                in_file = physical_file.reference
                position = physical_file.location
        position = position or document.physical_storage_location
        if not document.physical_copy_retained:
            status = "awaiting delivery to the firm" if not document.received_at else "not retained by the firm"
        else:
            status = cls._custody(document) or "filed"
        result = {"reference": document.reference or None, "in_file": in_file or None, "status": status}
        if include_position:
            result["location"] = position or None
        return result
