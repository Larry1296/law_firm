from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.cases.models import Case, MatterDeadline
from apps.cases.services.case_service import CaseService
from apps.communications.models import ClientCommunication, CommunicationAmendment
from apps.audit_logs.services import AuditService


class ClientCommunicationService:
    @classmethod
    @transaction.atomic
    def create(cls, *, user, matter_id, data):
        firm = CaseService.get_user_firm(user)
        matter = Case.objects.get(id=matter_id, firm=firm)
        if matter.matter_status == matter.MatterStatus.ARCHIVED:
            raise ValidationError({"matter": "Archived matters are read-only."})
        if data.get("follow_up_required") and not data.get("follow_up_deadline"):
            raise ValidationError({"follow_up_deadline": "Follow-up deadline is required."})
        responsible = data["responsible_staff"]
        try:
            responsible_firm = CaseService.get_user_firm(responsible)
        except PermissionError:
            responsible_firm = None
        if not responsible_firm or responsible_firm.id != firm.id:
            raise ValidationError({"responsible_staff": "Responsible staff must belong to this firm."})
        documents = list(data.pop("linked_documents", []))
        if any(document.firm_id != firm.id or document.client_id != matter.client_id for document in documents):
            raise ValidationError({"linked_documents": "Linked documents must belong to this firm and client."})
        record = ClientCommunication.objects.create(
            firm=firm, matter=matter, client=matter.client, created_by=user, **data
        )
        record.linked_documents.set(documents)
        AuditService.record(firm=firm, user=user, action="CLIENT_COMMUNICATION_RECORDED", obj=record, new={"channel": record.channel, "direction": record.direction, "occurred_at": record.occurred_at})
        cls.sync_follow_up(record, user)
        return record

    @staticmethod
    def _jsonable(values):
        return {key: value.isoformat() if hasattr(value, "isoformat") else value for key, value in values.items()}

    @staticmethod
    def sync_follow_up(record, user):
        """A follow-up promised in an attendance note goes into the matter's deadlines, so the advocate is reminded.

        One client follow-up deadline per note: created when a follow-up is needed, moved when its date is
        amended, cancelled when the amendment says none is needed.
        """
        source = f"COMMUNICATION:{record.id}"
        open_deadline = MatterDeadline.objects.filter(matter=record.matter, source=source, status=MatterDeadline.Status.OPEN).first()
        if record.follow_up_required and record.follow_up_deadline:
            if open_deadline is None:
                if MatterDeadline.objects.filter(matter=record.matter, source=source).exists():
                    return
                MatterDeadline.objects.create(
                    firm=record.firm, matter=record.matter, deadline_type=MatterDeadline.Type.CLIENT_FOLLOW_UP,
                    due_at=record.follow_up_deadline, responsible_staff=record.responsible_staff, priority="MEDIUM",
                    source=source, description=f"Follow up with {record.client.full_name}: {record.subject}",
                    created_by=user,
                )
            elif open_deadline.due_at != record.follow_up_deadline:
                open_deadline.due_at = record.follow_up_deadline
                open_deadline.save(update_fields=["due_at", "updated_at"])
        elif open_deadline is not None:
            open_deadline.status = MatterDeadline.Status.CANCELLED
            open_deadline.cancellation_reason = "The attendance note was amended: no follow-up needed."
            open_deadline.save(update_fields=["status", "cancellation_reason", "updated_at"])

    @classmethod
    @transaction.atomic
    def amend(cls, *, user, communication_id, changes, reason):
        firm = CaseService.get_user_firm(user)
        if not reason.strip():
            raise ValidationError({"reason": "An amendment reason is required."})
        record = ClientCommunication.objects.select_for_update().get(id=communication_id, firm=firm)
        allowed = {"summary", "advice_given", "instructions_received", "instructions_confirmed_in_writing", "follow_up_required", "follow_up_deadline"}
        changes = {key: value for key, value in changes.items() if key in allowed}
        previous = {key: getattr(record, key) for key in changes}
        for key, value in changes.items():
            setattr(record, key, value)
        record.save()
        # Dates are kept in the amendment history as ISO text, as JSON holds no dates.
        previous, changes = cls._jsonable(previous), cls._jsonable(changes)
        CommunicationAmendment.objects.create(
            communication=record, previous_values=previous, new_values=changes, reason=reason, actor=user
        )
        AuditService.record(firm=firm, user=user, action="CLIENT_COMMUNICATION_AMENDED", obj=record, previous=previous, new=changes, reason=reason)
        cls.sync_follow_up(record, user)
        return record
