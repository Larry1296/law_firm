from django.db import transaction
from rest_framework.exceptions import ValidationError
from apps.clients.models import Client, ClientMatterConflictCheck
from apps.clients.services.conflict import ClientMatterConflictService
from apps.clients.services.prospective_client_service import ProspectiveClientService, prospective_firm
from apps.common.choices import UserRole
from apps.staff.models import LawyerPermission


class ProspectiveMatterEntryService(ClientMatterConflictService):
    """Secretary permission applies only to recording a proposal, never decisions."""
    @staticmethod
    def get_user_firm(user):
        if user.role == UserRole.STAFF and hasattr(user, "secretary_profile"):
            return prospective_firm(user)
        return ClientMatterConflictService.get_user_firm(user)

    @classmethod
    def _assert_permission(cls, user, firm, code):
        if user.role == UserRole.STAFF and hasattr(user, "secretary_profile") and code == LawyerPermission.CREATE_PROPOSED_MATTER:
            if prospective_firm(user).id == firm.id:
                return
        return super()._assert_permission(user, firm, code)


class ProposedMatterEntryService:
    @staticmethod
    @transaction.atomic
    def create(*, user, data):
        firm = ProspectiveMatterEntryService.get_user_firm(user)
        ProspectiveMatterEntryService._assert_permission(user, firm, LawyerPermission.CREATE_PROPOSED_MATTER)
        if data.get('client_id'):
            try:
                client = Client.objects.select_for_update().get(id=data['client_id'], firm=firm, is_active=True)
            except Client.DoesNotExist as exc:
                raise ValidationError({'client_id': 'Client was not found for this firm.'}) from exc
        else:
            client = ProspectiveClientService.create(user=user, data=data.get('prospective_client') or {})
        existing = ClientMatterConflictCheck.objects.filter(firm=firm, client=client,
            proposed_matter_title=data['proposed_matter']['proposed_matter_title'], status='NOT_STARTED').first()
        if existing:
            return client, existing
        check = ProspectiveMatterEntryService.create_proposed_matter(user=user, client_id=client.id, data=data['proposed_matter'])
        return client, check
