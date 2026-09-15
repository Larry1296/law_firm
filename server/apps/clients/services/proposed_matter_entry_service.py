from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.audit_logs.services import AuditService
from apps.clients.models import Client, ClientMatterConflictCheck, ClientPrivacyRecord
from apps.clients.services.conflict import ClientMatterConflictService


class ProposedMatterEntryService:
    """Atomic, deliberately small entry point for the digital conflict workflow."""

    @staticmethod
    @transaction.atomic
    def create(*, user, data):
        firm = ClientMatterConflictService.get_user_firm(user)
        client_id = data.get("client_id")
        if client_id:
            try:
                client = Client.objects.select_for_update().get(id=client_id, firm=firm, is_active=True)
            except Client.DoesNotExist as exc:
                raise ValidationError({"client_id": "Client was not found for this firm."}) from exc
        else:
            prospect = data.get("prospective_client") or {}
            name = str(prospect.get("legal_name", "")).strip()
            if not name:
                raise ValidationError({"prospective_client": {"legal_name": "Legal name is required."}})
            kind = prospect.get("client_type", Client.ClientType.INDIVIDUAL)
            if kind not in dict(Client.ClientType.choices):
                raise ValidationError({"prospective_client": {"client_type": "Unsupported client/legal-entity type."}})
            client = Client.objects.create(
                firm=firm, created_by=user, full_name=name,
                client_type=kind, access_type=Client.AccessType.ASSISTED,
                lifecycle_status=Client.LifecycleStatus.PROSPECTIVE,
                is_verified=False, user=None,
                email=prospect.get("email") or None, phone_number=prospect.get("phone_number", ""),
            )
            privacy = prospect.get("privacy") or {}
            required = ("lawful_basis", "privacy_notice_version", "delivery_method")
            missing = [field for field in required if not privacy.get(field)]
            if missing:
                raise ValidationError({"prospective_client": {"privacy": f"Privacy evidence required: {', '.join(missing)}."}})
            ClientPrivacyRecord.objects.create(
                client=client, lawful_basis=privacy["lawful_basis"],
                privacy_notice_version=privacy["privacy_notice_version"],
                privacy_notice_delivered=True, delivery_method=privacy["delivery_method"],
                delivered_by=user, acknowledged=bool(privacy.get("acknowledged", False)),
                acknowledgement_reference=privacy.get("acknowledgement_reference", ""),
                data_source=privacy.get("data_source", "DIRECT"),
                retention_category=privacy.get("retention_category", ""),
            )
            AuditService.record(firm=firm, user=user, action="PROSPECTIVE_CLIENT_CREATED", obj=client,
                                new={"lifecycle_status": client.lifecycle_status, "access_type": client.access_type})

        existing = ClientMatterConflictCheck.objects.filter(
            firm=firm, client=client,
            proposed_matter_title=(data.get("proposed_matter") or {}).get("proposed_matter_title", ""),
            status="NOT_STARTED",
        ).first()
        if existing:
            return client, existing
        check = ClientMatterConflictService.create_proposed_matter(
            user=user, client_id=client.id, data=data.get("proposed_matter") or {}
        )
        return client, check
