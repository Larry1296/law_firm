from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from apps.audit_logs.services import AuditService
from apps.clients.models import IntakePrivacyConfig
from apps.firm.models import LawFirm


def snapshot(config):
    return {f.name: getattr(config, f.attname) for f in config._meta.concrete_fields}


def record(config, user, action, previous=None):
    AuditService.record(firm=config.firm, user=user, action=f'INTAKE_PRIVACY_{action}', obj=config,
                        previous=previous, new=snapshot(config))


@transaction.atomic
def create_config(*, firm, user, data):
    LawFirm.objects.select_for_update().get(pk=firm.pk)
    if IntakePrivacyConfig.objects.filter(firm=firm, policy_version=data['policy_version']).exists():
        raise ValidationError({'policy_version': 'This version already exists for this firm.'})
    config = IntakePrivacyConfig.objects.create(firm=firm, **data)
    record(config, user, 'CREATED')
    return config


@transaction.atomic
def transition_config(*, firm, user, pk, action):
    LawFirm.objects.select_for_update().get(pk=firm.pk)
    config = get_object_or_404(IntakePrivacyConfig.objects.select_for_update(), firm=firm, pk=pk)
    previous = snapshot(config)
    now = timezone.now()
    if action == 'activate':
        if config.status != 'DRAFT':
            raise ValidationError('Only draft versions can be approved and activated.')
        if config.effective_date > timezone.localdate():
            raise ValidationError('The effective date must be today or earlier to activate.')
        if not config.notice_text.strip():
            raise ValidationError('Notice text is required before activation.')
        for active in IntakePrivacyConfig.objects.select_for_update().filter(firm=firm, status='ACTIVE'):
            before = snapshot(active)
            active.status = 'RETIRED'
            active.retired_by = user
            active.retired_at = now
            active.save()
            record(active, user, 'RETIRED', before)
        config.status = 'ACTIVE'
        config.approved_by = config.activated_by = user
        config.approved_at = config.activated_at = now
    elif action == 'retire':
        if config.status != 'ACTIVE':
            raise ValidationError('Only active versions can be retired.')
        config.status = 'RETIRED'
        config.retired_by = user
        config.retired_at = now
    else:
        raise ValidationError('Unknown privacy configuration action.')
    config.save()
    if action == 'activate':
        record(config, user, 'APPROVED', previous)
    record(config, user, 'ACTIVATED' if action == 'activate' else 'RETIRED', previous)
    return config
