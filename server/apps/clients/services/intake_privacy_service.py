from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from apps.audit_logs.services import AuditService
from apps.clients.models import IntakePrivacyConfig
from apps.firm.models import LawFirm


STANDARD_NOTICE_TEXT = (
    "{firm} (\"we\") collects and uses your personal data to check for conflicts of interest, "
    "to verify your identity as the Proceeds of Crime and Anti-Money Laundering Act requires, to assess and act "
    "on your instructions, to account for any money we hold for you, and to meet our duties as advocates.\n\n"
    "What we collect: your name, contact details and identification documents, details of your matter and of the "
    "other people involved in it, and records of payments.\n\n"
    "Why we may use it: to carry out our engagement with you and to comply with our legal obligations.\n\n"
    "Who sees it: our advocates and staff working on your matter and, where your matter requires it, courts, "
    "tribunals, other parties' advocates, experts, banks and regulators. We do not sell your data, and we send it "
    "outside Kenya only where your matter requires it and the law allows.\n\n"
    "How long we keep it: while your matter is open, and afterwards for as long as the law requires us to keep "
    "client files and accounting records.\n\n"
    "Your rights under the Data Protection Act, 2019: you may ask what personal data we hold about you, see it, have "
    "it corrected, or have it deleted where the law allows, and you may object to its use. If you do not give us the "
    "information we need, we may be unable to act for you. You may complain to the Office of the Data Protection "
    "Commissioner.\n\n"
    "Questions about your data: {contact}."
)


def standard_notice(firm):
    """Prefilled values for a firm's first notice. The owner reads and approves them; nothing is saved here."""
    year = timezone.localdate().year
    used = set(IntakePrivacyConfig.objects.filter(firm=firm).values_list('policy_version', flat=True))
    number = 1
    while f'{year}.{number}' in used:
        number += 1
    contact = ' or '.join(value for value in (firm.email, firm.phone_number) if value) or 'ask at our office'
    return {
        'policy_version': f'{year}.{number}',
        'lawful_basis': 'MULTIPLE_APPLICABLE_BASES',
        'effective_date': timezone.localdate().isoformat(),
        'notice_text': STANDARD_NOTICE_TEXT.format(firm=firm.name, contact=contact),
    }


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
