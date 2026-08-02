from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.cases.models import (
    Case,
    CaseAttachment,
    CaseAttachmentReferenceSequence,
    CaseTask,
    MatterDocumentTransfer,
    MatterPhysicalFile,
    MatterPhysicalFileMovement,
)
from apps.clients.models import ClientDocument, ClientDocumentRegisterRemoval
from apps.staff.models import SecretaryPermission


class MatterPhysicalFileService:
    @staticmethod
    def _records_secretary(user):
        secretary = getattr(user, "secretary_profile", None)
        return bool(
            secretary
            and secretary.is_active
            and secretary.can_receive_documents
            and (
                secretary.has_permission(SecretaryPermission.MANAGE_DOCUMENTS)
                or secretary.has_permission(SecretaryPermission.MANAGE_CASES)
            )
        )

    @staticmethod
    def _firm_admin(user, firm):
        return getattr(firm, "owner_id", None) == user.id

    @classmethod
    def require_records_authority(cls, user, firm):
        if cls._records_secretary(user) and user.secretary_profile.law_firm_id == firm.id:
            return
        if cls._firm_admin(user, firm):
            return
        raise PermissionDenied("Only authorised records staff can change physical matter-file custody.")

    @staticmethod
    def ensure_pending(case, actor):
        physical_file, created = MatterPhysicalFile.objects.get_or_create(
            matter=case,
            defaults={
                "firm": case.firm,
                "reference": case.case_number,
                "status": MatterPhysicalFile.Status.REQUESTED,
                "custody_label": "Awaiting preparation",
            },
        )
        if created:
            MatterPhysicalFileMovement.objects.create(
                physical_file=physical_file,
                action=MatterPhysicalFileMovement.Action.REQUESTED,
                previous_status="",
                new_status=physical_file.status,
                reason="Internal matter opened; physical folder preparation requested.",
                recorded_by=actor,
            )
        return physical_file

    @staticmethod
    def serialize(physical_file, include_history=True):
        latest = physical_file.movements.order_by("-recorded_at").first()
        result = {
            "id": str(physical_file.id),
            "reference": physical_file.reference,
            "status": physical_file.status,
            "status_label": physical_file.get_status_display(),
            "storage_zone": physical_file.storage_zone,
            "cabinet": physical_file.cabinet,
            "shelf_or_drawer": physical_file.shelf_or_drawer,
            "location_detail": physical_file.location_detail,
            "location": physical_file.location,
            "assigned_by": physical_file.assigned_by.full_name if physical_file.assigned_by_id else "",
            "assigned_at": physical_file.assigned_at,
            "current_custodian": physical_file.current_custodian.full_name if physical_file.current_custodian_id else physical_file.custody_label,
            "notes": physical_file.notes,
            "archived_at": physical_file.archived_at,
            "assignment_pending": physical_file.status in {MatterPhysicalFile.Status.REQUESTED, MatterPhysicalFile.Status.AWAITING_PREPARATION},
            "last_movement": None if not latest else {
                "action": latest.action,
                "action_label": latest.get_action_display(),
                "recorded_at": latest.recorded_at,
                "recorded_by": latest.recorded_by.full_name,
                "reason": latest.reason,
            },
        }
        if include_history:
            result["movements"] = [{
                "id": str(item.id), "action": item.action, "action_label": item.get_action_display(),
                "previous_status": item.previous_status, "new_status": item.new_status,
                "previous_location": item.previous_location, "new_location": item.new_location,
                "issued_to": item.issued_to.full_name if item.issued_to_id else "",
                "returned_by": item.returned_by.full_name if item.returned_by_id else "",
                "reason": item.reason, "recorded_by": item.recorded_by.full_name,
                "recorded_at": item.recorded_at,
            } for item in physical_file.movements.select_related("issued_to", "returned_by", "recorded_by").all()]
        return result

    @classmethod
    @transaction.atomic
    def assign(cls, user, case, data):
        cls.require_records_authority(user, case.firm)
        physical_file = MatterPhysicalFile.objects.select_for_update().get(matter=case, firm=case.firm)
        if physical_file.status not in {MatterPhysicalFile.Status.REQUESTED, MatterPhysicalFile.Status.AWAITING_PREPARATION}:
            raise ValidationError({"status": "This matter already has a confirmed physical file."})
        storage_zone = (data.get("storage_zone") or "").strip()
        cabinet = (data.get("cabinet") or "").strip()
        shelf = (data.get("shelf_or_drawer") or "").strip()
        if not storage_zone or not cabinet or not shelf:
            raise ValidationError({"location": "Storage zone, cabinet and shelf/drawer are required."})
        previous_status, previous_location = physical_file.status, physical_file.location
        physical_file.storage_zone = storage_zone
        physical_file.cabinet = cabinet
        physical_file.shelf_or_drawer = shelf
        physical_file.location_detail = (data.get("location_detail") or "").strip()
        physical_file.notes = (data.get("notes") or "").strip()
        physical_file.status = MatterPhysicalFile.Status.ACTIVE
        physical_file.assigned_by = user
        physical_file.assigned_at = timezone.now()
        physical_file.current_custodian = None
        physical_file.custody_label = "Records room"
        physical_file.save()
        MatterPhysicalFileMovement.objects.create(
            physical_file=physical_file, action=MatterPhysicalFileMovement.Action.ASSIGNED,
            previous_status=previous_status, new_status=physical_file.status,
            previous_location=previous_location, new_location=physical_file.location,
            reason=(data.get("reason") or "Physical folder prepared, labelled and placed in active storage.").strip(),
            recorded_by=user,
        )
        return physical_file

    @classmethod
    @transaction.atomic
    def move(cls, user, case, data):
        cls.require_records_authority(user, case.firm)
        physical_file = MatterPhysicalFile.objects.select_for_update().get(matter=case, firm=case.firm)
        action = data.get("action")
        reason = (data.get("reason") or "").strip()
        if not reason:
            raise ValidationError({"reason": "Record the reason for this custody action."})
        previous_status, previous_location = physical_file.status, physical_file.location
        issued_to = returned_by = None
        if action == MatterPhysicalFileMovement.Action.CHECKED_OUT:
            issued_to_id = data.get("issued_to")
            if issued_to_id == "ASSIGNED_LAWYER":
                issued_to_id = case.assigned_lawyer.user_id if case.assigned_lawyer_id else None
            if not issued_to_id:
                raise ValidationError({"issued_to": "Select the person receiving the file."})
            from apps.users.models import User
            issued_to = User.objects.filter(id=issued_to_id).filter(
                Q(firm_memberships__firm=case.firm, firm_memberships__is_active=True)
                | Q(lawyer_profile__law_firm=case.firm, lawyer_profile__is_active=True)
                | Q(secretary_profile__law_firm=case.firm, secretary_profile__is_active=True)
                | Q(id=case.firm.owner_id)
            ).distinct().first()
            if not issued_to and case.firm.owner_id == issued_to_id:
                issued_to = case.firm.owner
            if not issued_to:
                raise ValidationError({"issued_to": "The custodian must belong to this firm."})
            physical_file.status = MatterPhysicalFile.Status.CHECKED_OUT
            physical_file.current_custodian = issued_to
            physical_file.custody_label = ""
        elif action == MatterPhysicalFileMovement.Action.RETURNED:
            returned_by = physical_file.current_custodian or user
            physical_file.status = MatterPhysicalFile.Status.ACTIVE
            physical_file.current_custodian = None
            physical_file.custody_label = "Records room"
        elif action == MatterPhysicalFileMovement.Action.RELOCATED:
            for field in ("storage_zone", "cabinet", "shelf_or_drawer", "location_detail"):
                if field in data:
                    setattr(physical_file, field, (data.get(field) or "").strip())
            if not physical_file.storage_zone or not physical_file.cabinet or not physical_file.shelf_or_drawer:
                raise ValidationError({"location": "The new structured location is incomplete."})
        elif action == MatterPhysicalFileMovement.Action.MARKED_MISSING:
            physical_file.status = MatterPhysicalFile.Status.MISSING
        elif action == MatterPhysicalFileMovement.Action.FOUND:
            physical_file.status = MatterPhysicalFile.Status.ACTIVE
            physical_file.current_custodian = None
            physical_file.custody_label = "Records room"
        elif action == MatterPhysicalFileMovement.Action.SENT_FOR_ARCHIVING:
            physical_file.status = MatterPhysicalFile.Status.CLOSURE_PENDING
        elif action == MatterPhysicalFileMovement.Action.ARCHIVED:
            for field in ("storage_zone", "cabinet", "shelf_or_drawer", "location_detail"):
                if field in data:
                    setattr(physical_file, field, (data.get(field) or "").strip())
            physical_file.status = MatterPhysicalFile.Status.ARCHIVED
            physical_file.archived_at = timezone.now()
            physical_file.current_custodian = None
            physical_file.custody_label = "Archive records room"
        else:
            raise ValidationError({"action": "Select a supported custody action."})
        physical_file.save()
        if action in {MatterPhysicalFileMovement.Action.RELOCATED, MatterPhysicalFileMovement.Action.ARCHIVED}:
            for document in physical_file.documents.all():
                section_label = document.get_physical_section_display()
                document.physical_storage_location = " / ".join(filter(None, [
                    physical_file.location, physical_file.reference, section_label, document.item_location_detail,
                ]))
                document.save(update_fields=["physical_storage_location", "updated_at"])
        MatterPhysicalFileMovement.objects.create(
            physical_file=physical_file, action=action,
            previous_status=previous_status, new_status=physical_file.status,
            previous_location=previous_location, new_location=physical_file.location,
            issued_to=issued_to, returned_by=returned_by, reason=reason, recorded_by=user,
        )
        return physical_file

    @staticmethod
    @transaction.atomic
    def request_retrieval(user, case, data):
        physical_file = MatterPhysicalFile.objects.select_for_update().get(matter=case, firm=case.firm)
        if not getattr(user, "lawyer_profile", None) and case.firm.owner_id != user.id:
            raise PermissionDenied("Only the responsible advocate or firm administrator may request retrieval.")
        if getattr(user, "lawyer_profile", None) and case.assigned_lawyer_id != user.lawyer_profile.id:
            raise PermissionDenied("Only the responsible advocate may request this file.")
        if not case.assigned_secretary_id:
            raise ValidationError({"assigned_secretary": "Assign a secretary before requesting physical-file retrieval."})
        task, _ = CaseTask.objects.get_or_create(
            case=case,
            title=f"Retrieve physical matter file {physical_file.reference}",
            status__in=[CaseTask.TaskStatus.PENDING, CaseTask.TaskStatus.IN_PROGRESS],
            defaults={
                "description": (data.get("reason") or "Retrieve the physical matter file for advocate review.").strip(),
                "task_type": CaseTask.TaskType.OTHER,
                "priority": CaseTask.Priority.HIGH,
                "assigned_to": case.assigned_secretary.user,
                "created_by": user,
                "is_client_visible": False,
            },
        )
        return task

    @staticmethod
    def next_document_reference(case):
        sequence, _ = CaseAttachmentReferenceSequence.objects.get_or_create(case=case)
        sequence = CaseAttachmentReferenceSequence.objects.select_for_update().get(case=case)
        while True:
            reference = f"{case.case_number}/D{sequence.next_number:03d}"
            sequence.next_number += 1
            sequence.save(update_fields=["next_number", "updated_at"])
            if not CaseAttachment.objects.filter(case=case, document_reference=reference).exists():
                return reference

    @classmethod
    @transaction.atomic
    def transfer_client_document(cls, user, case, document_id, data):
        cls.require_records_authority(user, case.firm)
        physical_file = MatterPhysicalFile.objects.select_for_update().get(matter=case, firm=case.firm)
        if physical_file.status != MatterPhysicalFile.Status.ACTIVE:
            raise ValidationError({"physical_file": "Assign and activate the physical matter file before transferring evidence."})
        document = ClientDocument.objects.select_for_update().get(
            id=document_id, client=case.client, firm=case.firm, archived_at__isnull=True
        )
        if document.classification != ClientDocument.Classification.MATTER_SPECIFIC:
            raise ValidationError({"classification": "Only matter-specific evidence may be transferred into the matter file."})
        section = data.get("physical_section") or CaseAttachment.PhysicalSection.EVIDENCE
        reference = cls.next_document_reference(case)
        item_detail = (data.get("item_location_detail") or "").strip()
        destination = " / ".join(filter(None, [physical_file.location, physical_file.reference, dict(CaseAttachment.PhysicalSection.choices)[section], item_detail]))
        attachment = CaseAttachment.objects.create(
            case=case, physical_file=physical_file, document_reference=reference,
            attachment_type=CaseAttachment.AttachmentType.EVIDENCE,
            title=document.title, description=document.description,
            physical_copy_type=(CaseAttachment.PhysicalCopyType.ORIGINAL if document.source_copy_type == ClientDocument.SourceCopyType.ORIGINAL else CaseAttachment.PhysicalCopyType.CERTIFIED_COPY if document.source_copy_type == ClientDocument.SourceCopyType.CERTIFIED_COPY else CaseAttachment.PhysicalCopyType.OFFICE_COPY),
            physical_storage_location=destination, document_date=document.document_date,
            physical_section=section, item_location_detail=item_detail,
            origin=CaseAttachment.Origin.CLIENT_SUPPLIED, uploaded_by=user,
            is_client_visible=document.is_client_visible, is_confidential=document.is_confidential,
        )
        MatterDocumentTransfer.objects.create(
            source_document=document, destination_attachment=attachment,
            previous_reference=document.reference, new_reference=reference,
            previous_location=document.physical_storage_location, new_location=destination,
            source_register="CLIENT_PHYSICAL_REGISTER", destination_register="MATTER_PHYSICAL_FILE",
            reason=(data.get("reason") or "Matter-specific evidence transferred to its authoritative matter file.").strip(),
            transferred_by=user, receipt_acknowledgement=(data.get("receipt_acknowledgement") or "").strip(),
        )
        document.archived_at = timezone.now()
        document.physical_copy_retained = False
        document.custody_notes = f"Transferred to {reference}; previous reference retained in audit history."
        document.updated_by = user
        document.save(update_fields=["archived_at", "physical_copy_retained", "custody_notes", "updated_by", "updated_at"])
        ClientDocumentRegisterRemoval.objects.create(
            document=document, reason=f"Transferred to matter register as {reference}.", removed_by=user
        )
        return attachment

    @staticmethod
    def mark_closure_pending(case, actor):
        physical_file = MatterPhysicalFile.objects.select_for_update().filter(matter=case).first()
        if not physical_file or physical_file.status == MatterPhysicalFile.Status.ARCHIVED:
            return
        previous = physical_file.status
        physical_file.status = MatterPhysicalFile.Status.CLOSURE_PENDING
        physical_file.save(update_fields=["status", "updated_at"])
        MatterPhysicalFileMovement.objects.create(
            physical_file=physical_file, action=MatterPhysicalFileMovement.Action.SENT_FOR_ARCHIVING,
            previous_status=previous, new_status=physical_file.status,
            previous_location=physical_file.location, new_location=physical_file.location,
            reason="Matter closed; records return and archive review required.", recorded_by=actor,
        )
        CaseTask.objects.get_or_create(
            case=case, title="Review and archive physical matter file",
            defaults={"description": "Confirm all checked-out records are returned and assign the closed/archive location.", "task_type": CaseTask.TaskType.OTHER, "priority": CaseTask.Priority.HIGH, "assigned_to": case.assigned_secretary.user if case.assigned_secretary_id else case.assigned_lawyer.user, "created_by": actor, "is_client_visible": False},
        )
