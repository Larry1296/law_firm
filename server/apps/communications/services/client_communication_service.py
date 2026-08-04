from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.cases.models import Case
from apps.cases.services.case_service import CaseService
from apps.communications.models import ClientCommunication, CommunicationAmendment


class ClientCommunicationService:
    @classmethod
    @transaction.atomic
    def create(cls, *, user, matter_id, data):
        firm = CaseService.get_user_firm(user)
        matter = Case.objects.get(id=matter_id, firm=firm)
        if data.get("follow_up_required") and not data.get("follow_up_deadline"):
            raise ValidationError({"follow_up_deadline": "Follow-up deadline is required."})
        return ClientCommunication.objects.create(
            firm=firm, matter=matter, client=matter.client, created_by=user, **data
        )

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
        return record
