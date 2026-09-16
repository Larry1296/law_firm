from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError
from apps.audit_logs.services import AuditService
from apps.clients.models import Client, ClientDueDiligence, ClientPrivacyRecord, ClientRepresentative
from apps.clients.prospective_metadata import PROSPECTIVE_PROFILES
from apps.clients.services.onboarding_service import PROFILE_MODELS
from apps.common.choices import UserRole
from apps.staff.services.secretary import SecretaryClientService


def prospective_firm(user):
    if not user.is_active:
        raise PermissionDenied('An active account is required.')
    if user.role == UserRole.ADMIN and hasattr(user, 'owned_firm'):
        return user.owned_firm
    if user.role == UserRole.STAFF and hasattr(user, "secretary_profile"):
        try:
            return SecretaryClientService.ensure_can_manage_clients(user).law_firm
        except (ValueError, PermissionError) as exc:
            raise PermissionDenied(str(exc)) from exc
    raise PermissionDenied('Only firm admins and authorised secretaries can create prospective clients.')


class ProspectiveClientService:
    @staticmethod
    @transaction.atomic
    def create(*, user, data):
        from apps.clients.serializers.prospective_client_serializer import ProspectiveClientCreateSerializer
        firm = prospective_firm(user)
        serializer = ProspectiveClientCreateSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        values = dict(serializer.validated_data)
        privacy = values.pop('privacy')
        from apps.clients.models import IntakePrivacyConfig
        config = IntakePrivacyConfig.active_for(firm)
        if config is None:
            raise ValidationError({'privacy': 'An approved active firm intake-privacy configuration is required.'})
        privacy.update(lawful_basis=config.lawful_basis, privacy_notice_version=config.policy_version)
        profile_data = values.pop('legal_profile')
        rep = values.pop('representative', None)
        acting_for_self = values.pop('acting_for_self')
        kind = values['client_type']
        client = Client.objects.create(
            firm=firm, created_by=user, user=None,
            lifecycle_status=Client.LifecycleStatus.PROSPECTIVE, is_verified=False,
            portal_status='PORTAL_ENABLED_PENDING' if values['access_type'] == Client.AccessType.PORTAL_ENABLED else 'NOT_REQUESTED',
            classification_review_status='REQUIRES_REVIEW' if kind == 'OTHER_REQUIRES_REVIEW' else 'NOT_REQUIRED',
            **values,
        )
        name_field = PROSPECTIVE_PROFILES[kind]['name_field']
        if name_field:
            profile_data[name_field] = client.full_name
        if kind == 'COMPANY':
            profile_data.update(company_status='UNKNOWN', company_type='UNKNOWN')
            profile_data['registration_number'] = profile_data.get('registration_number') or None
        elif kind == 'NON_PROFIT_ORGANIZATION':
            profile_data['pbo_or_ngo_status'] = 'UNVERIFIED'
        elif kind == 'INDIVIDUAL':
            profile_data.update(nationality='', citizenship='')
        model = PROFILE_MODELS.get(kind)
        if model:
            try:
                profile = model(client=client, **profile_data)
                profile.full_clean()
                profile.save()
            except DjangoValidationError as exc:
                raise ValidationError({'legal_profile': exc.message_dict}) from exc
        if rep:
            ClientRepresentative.objects.create(client=client, is_primary=True, **rep)
        ClientDueDiligence.objects.create(client=client, acting_for_self=acting_for_self if kind == 'INDIVIDUAL' else False)
        ClientPrivacyRecord.objects.create(client=client, delivered_by=user, delivered_at=timezone.now(), **privacy)
        AuditService.record(firm=firm, user=user, action='PROSPECTIVE_CLIENT_CREATED', obj=client,
                            new={'lifecycle_status': client.lifecycle_status, 'access_type': client.access_type, 'client_type': kind})
        return client

    @staticmethod
    @transaction.atomic
    def invite(*, user, client_id):
        from apps.clients.services.admin.client_admin_create_service import ClientAdminCreateService
        from apps.authentication.services.auth_service import AuthService
        firm = prospective_firm(user)
        try:
            client = Client.objects.select_for_update().get(id=client_id, firm=firm, is_active=True, lifecycle_status='PROSPECTIVE')
        except Client.DoesNotExist as exc:
            raise ValidationError('Active prospective client not found in this firm.') from exc
        if not client.matter_conflict_checks.filter(firm=firm, status='CLEARED', acceptance_decision='ACCEPTED').exists():
            raise ValidationError('Conflict clearance and firm acceptance are required before portal invitation.')
        if client.access_type != Client.AccessType.PORTAL_ENABLED:
            raise ValidationError('Firm-managed clients cannot receive portal invitations.')
        if client.user_id or client.portal_status != 'PORTAL_ENABLED_PENDING':
            raise ValidationError('A portal invitation has already been created.')
        rep = client.representatives.filter(is_portal_contact=True).first()
        email = client.email if client.client_type == 'INDIVIDUAL' else (rep.email if rep else '')
        if not email:
            raise ValidationError('An authorised portal contact email is required.')
        phone = rep.telephone if rep else client.phone_number
        if not phone:
            raise ValidationError('The controlled account service requires a portal contact telephone before sending an invitation. Save it during onboarding first.')
        portal_user, _ = ClientAdminCreateService._create_portal_user(
            client, {'email': email, 'phone_number': rep.telephone if rep else client.phone_number},
            {'contact_full_name': rep.full_legal_name if rep else client.full_name},
        )
        # Only the expiring account-setup link can establish a usable password.
        portal_user.set_unusable_password()
        portal_user.save(update_fields=['password'])
        client.portal_status = 'INVITED'
        client.save(update_fields=['portal_status'])
        AuditService.record(firm=firm, user=user, action='PROSPECTIVE_PORTAL_INVITED', obj=client,
                            new={'portal_status': 'INVITED'})
        AuthService.request_password_reset(email, fail_silently=False)
        return client
