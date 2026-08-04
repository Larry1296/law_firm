from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.cases.models import Case
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
        return record

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
        CommunicationAmendment.objects.create(
            communication=record, previous_values=previous, new_values=changes, reason=reason, actor=user
        )
        AuditService.record(firm=firm, user=user, action="CLIENT_COMMUNICATION_AMENDED", obj=record, previous=previous, new=changes, reason=reason)
        return record
