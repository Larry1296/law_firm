"""Full data entry for an existing prospect; never promotes or clears a client."""
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework.exceptions import ValidationError
from apps.audit_logs.services import AuditService
from apps.clients.models import (Client, ClientAddress, ClientBeneficialOwner, ClientContact,
    ClientDueDiligence, ClientPrivacyRecord, ClientRepresentative, ClientSectorProfile,
    EducationInstitutionProfile, EducationCurriculum)
from apps.clients.serializers.onboarding_serializers import ClientOnboardingCreateSerializer
from apps.clients.services.onboarding_service import PROFILE_MODELS, _model_values
from apps.clients.services.prospective_client_service import prospective_firm


class OnboardingCompletionService:
    @staticmethod
    @transaction.atomic
    def save(*, user, client_id, data):
        firm = prospective_firm(user)
        try:
            client = Client.objects.select_for_update().get(id=client_id, firm=firm, is_active=True, lifecycle_status='PROSPECTIVE')
        except Client.DoesNotExist as exc:
            raise ValidationError('An active prospective client in this firm is required.') from exc
        if not client.matter_conflict_checks.filter(status='CLEARED').exists():
            raise ValidationError('Complete conflict clearance before full onboarding / KYC.')
        serializer = ClientOnboardingCreateSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        base = values['client']
        if base.get('client_type') != client.client_type or base.get('access_type') != client.access_type:
            raise ValidationError('Legal category and access type cannot be changed during onboarding completion.')
        for field in ('full_name', 'email', 'phone_number', 'national_id', 'passport_number', 'kra_pin', 'date_of_birth', 'provisional_legal_description', 'classification_evidence_reference', 'classification_review_reason'):
            if field in base:
                setattr(client, field, base[field])
        try:
            client.full_clean()
            client.save()
            model = PROFILE_MODELS.get(client.client_type)
            if model:
                profile = model.objects.get(client=client)
                for key, value in _model_values(model, values['legal_profile']).items():
                    setattr(profile, key, value)
                profile.full_clean()
                profile.save()
            for section, model in [('representatives', ClientRepresentative), ('contacts', ClientContact), ('addresses', ClientAddress), ('beneficial_owners', ClientBeneficialOwner)]:
                kept = []
                for raw, row in zip(data.get(section, []), values.get(section, [])):
                    if row.get('linked_client') and row['linked_client'].firm_id != firm.id:
                        raise ValidationError({section: 'Linked client must belong to this firm.'})
                    row_id = raw.get('id')
                    if row_id:
                        item = model.objects.filter(client=client, id=row_id).first()
                        if item is None:
                            raise ValidationError({section: 'Record does not belong to this client.'})
                    else:
                        item = model(client=client)
                    for key, value in row.items():
                        setattr(item, key, value)
                    if getattr(item, 'is_verified', False) or getattr(item, 'verification_status', '') == 'VERIFIED':
                        item.verified_by = user
                    item.full_clean()
                    item.save()
                    kept.append(item.pk)
                if section in data:
                    model.objects.filter(client=client).exclude(pk__in=kept).delete()
            for section, model in [('due_diligence', ClientDueDiligence), ('privacy', ClientPrivacyRecord)]:
                row = values.get(section)
                if row is not None:
                    item, _ = model.objects.get_or_create(client=client)
                    for key, value in row.items():
                        setattr(item, key, value)
                    if section == 'privacy' and item.privacy_notice_delivered:
                        item.delivered_by = user
                    if section == 'due_diligence':
                        if item.identity_verification_status == 'VERIFIED':
                            item.identity_verified_by = user
                        if item.authority_verified:
                            item.authority_verified_by = user
                    item.full_clean()
                    item.save()
            sectors = base.get('sectors', [])
            ClientSectorProfile.objects.filter(client=client).exclude(sector__in=sectors).delete()
            for sector in sectors:
                ClientSectorProfile.objects.get_or_create(client=client, sector=sector)
            education = values.get('regulatory_profiles', {}).get('education')
            if education:
                curricula = education.pop('curricula', [])
                item, _ = EducationInstitutionProfile.objects.get_or_create(client=client)
                for key, value in education.items():
                    setattr(item, key, value)
                if item.verification_status == 'VERIFIED':
                    item.verified_by = user
                item.full_clean()
                item.save()
                item.curricula.all().delete()
                for row in curricula:
                    curriculum = EducationCurriculum(education_profile=item, **row)
                    curriculum.full_clean()
                    curriculum.save()
        except DjangoValidationError as exc:
            raise ValidationError(getattr(exc, 'message_dict', exc.messages)) from exc
        AuditService.record(firm=firm, user=user, action='CLIENT_ONBOARDING_UPDATED', obj=client,
                            new={'lifecycle_status': client.lifecycle_status})
        return client
