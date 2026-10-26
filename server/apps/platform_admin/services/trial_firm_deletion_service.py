"""Explicit tenant erasure, available only for a never-subscribed trial firm.

Normal domain deletion deliberately protects ledgers, audit and custody history.
This separate platform command removes the entire tenant, including those rows;
it must never be used for ordinary client/matter deletion.
"""
from collections import defaultdict

from django.apps import apps
from django.core.files.storage import default_storage
from django.db import models, transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.platform_admin.models import FirmFileCleanup, PlatformActivity
from apps.subscriptions.models import FirmSubscription, SubscriptionInvoice
from apps.users.models import User


class TrialFirmDeletionService:
    @staticmethod
    def eligibility(firm, subscription=None):
        subscription = subscription or FirmSubscription.objects.filter(firm=firm).first()
        reason = ''
        if not subscription or not subscription.trial_ends_at:
            reason = 'Only firms with a recorded trial can be deleted.'
        elif (subscription.has_ever_subscribed or subscription.status == FirmSubscription.Status.ACTIVE or subscription.is_complimentary
              or subscription.current_period_end):
            reason = 'This firm has subscribed or received access beyond its trial.'
        elif SubscriptionInvoice.objects.filter(firm=firm).filter(
            Q(status__in=[SubscriptionInvoice.Status.PAID, SubscriptionInvoice.Status.PAYMENT_SUBMITTED])
            | Q(confirmed_at__isnull=False) | Q(payment_submitted_at__isnull=False) | ~Q(mpesa_receipt='')
        ).exists():
            reason = 'This firm has a subscription payment or submitted payment on record.'
        return {'can_delete_trial': not reason, 'deletion_block_reason': reason}

    @staticmethod
    def _query(model, ids):
        # Use the base manager so archived/inactive records are included.
        return model._base_manager.filter(pk__in=ids)

    @classmethod
    def _tenant_rows(cls, firm):
        all_models = [model for model in apps.get_models(include_auto_created=True)
                      if model._meta.managed and not model._meta.proxy]
        rows = defaultdict(set)
        rows[LawFirm].add(firm.pk)
        # Follow dependent rows, including PROTECT/SET_NULL relationships, but
        # never follow a forward FK to shared plans, statutes or user actors.
        changed = True
        while changed:
            changed = False
            for model in all_models:
                if model is User:
                    continue
                condition = Q()
                for field in model._meta.local_fields:
                    if field.is_relation and (field.many_to_one or field.one_to_one):
                        parent = field.remote_field.model
                        if rows.get(parent):
                            condition |= Q(**{f'{field.attname}__in': rows[parent]})
                if not condition:
                    continue
                found = set(model._base_manager.select_for_update().filter(condition).values_list('pk', flat=True)) - rows[model]
                if found:
                    # A malformed cross-tenant reference must fail closed.
                    for field in model._meta.local_fields:
                        if field.is_relation and field.remote_field and field.remote_field.model is LawFirm:
                            if cls._query(model, found).exclude(**{field.attname: firm.pk}).exclude(**{f'{field.attname}__isnull': True}).exists():
                                raise ValidationError({'firm': 'A cross-firm dependency must be resolved before deletion.'})
                    rows[model].update(found)
                    changed = True
        return rows, all_models

    @classmethod
    def _exclusive_users(cls, firm, rows, all_models):
        candidates = {firm.owner_id}
        for model, ids in list(rows.items()):
            for field in model._meta.local_fields:
                if field.name == 'user' and field.is_relation and field.remote_field.model is User:
                    candidates.update(cls._query(model, ids).exclude(**{f'{field.attname}__isnull': True}).values_list(field.attname, flat=True))
        # Lock accounts before deciding whether they are shared with another tenant.
        for user in User.objects.select_for_update().filter(pk__in=candidates).exclude(role=UserRole.PLATFORM_ADMIN):
            personal = defaultdict(set)
            shared = False
            for model in all_models:
                for field in model._meta.local_fields:
                    if not field.is_relation or not field.remote_field or field.remote_field.model is not User:
                        continue
                    outside = model._base_manager.filter(**{field.attname: user.pk}).exclude(pk__in=rows.get(model, set()))
                    # Authentication tokens, preferences and private learning
                    # progress belong to the account, not to another tenant.
                    account_owned = (field.name == 'user' and model._meta.app_label in {'users', 'token_blacklist', 'tutorials'}) or model._meta.auto_created
                    if outside.exists():
                        if account_owned:
                            personal[model].update(outside.values_list('pk', flat=True))
                        else:
                            shared = True
            if not shared:
                rows[User].add(user.pk)
                for model, ids in personal.items():
                    rows[model].update(ids)
        # Blacklisted tokens depend on outstanding tokens, not directly on User.
        from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
        tokens = OutstandingToken.objects.filter(user_id__in=rows.get(User, set()))
        rows[OutstandingToken].update(tokens.values_list('pk', flat=True))
        rows[BlacklistedToken].update(BlacklistedToken.objects.filter(token__in=tokens).values_list('pk', flat=True))

    @classmethod
    @transaction.atomic
    def delete(cls, *, actor, firm_id, confirmation):
        if not actor.is_active or actor.role != UserRole.PLATFORM_ADMIN:
            raise PermissionDenied('Only an active platform administrator can delete a trial firm.')
        firm = get_object_or_404(LawFirm.objects.select_for_update(), pk=firm_id)
        subscription = FirmSubscription.objects.select_for_update().filter(firm=firm).first()
        list(SubscriptionInvoice.objects.select_for_update().filter(firm=firm))
        eligibility = cls.eligibility(firm, subscription)
        if not eligibility['can_delete_trial']:
            raise ValidationError({'firm': eligibility['deletion_block_reason']})
        if confirmation != firm.name:
            raise ValidationError({'confirmation': 'Type the exact firm name to confirm permanent deletion.'})

        rows, all_models = cls._tenant_rows(firm)
        cls._exclusive_users(firm, rows, all_models)
        files = set()
        for model, ids in list(rows.items()):
            for field in model._meta.local_fields:
                if isinstance(field, models.FileField):
                    files.update(name for name in cls._query(model, ids).values_list(field.attname, flat=True) if name)
        # A shared file name must remain while any surviving record references it.
        for model in all_models:
            for field in model._meta.local_fields:
                if isinstance(field, models.FileField):
                    files.difference_update(model._base_manager.exclude(pk__in=rows.get(model, set())).filter(**{f'{field.attname}__in': files}).values_list(field.attname, flat=True))
        cleanup_ids = []
        for name in files:
            item, _ = FirmFileCleanup.objects.get_or_create(name=name)
            cleanup_ids.append(item.pk)
        # All Django-created FKs are deferred until commit on supported databases.
        # Raw deletion is intentional here: normal immutable/PROTECT guards stay
        # in force everywhere else in the application.
        for model, ids in rows.items():
            if ids:
                cls._query(model, ids)._raw_delete('default')
        PlatformActivity.record(actor, PlatformActivity.Action.FIRM_DELETED,
                                f'Permanently deleted never-subscribed trial firm {firm_id}.')
        result = {'deleted': True, 'firm_id': str(firm_id), 'file_cleanup_pending': bool(cleanup_ids)}
        def finish_cleanup():
            cls.cleanup_files(cleanup_ids)
            result['file_cleanup_pending'] = FirmFileCleanup.objects.filter(pk__in=cleanup_ids).exists()
        transaction.on_commit(finish_cleanup)
        return result

    @staticmethod
    def cleanup_files(ids=None):
        records = FirmFileCleanup.objects.all()
        if ids is not None:
            records = records.filter(pk__in=ids)
        for item in records:
            try:
                shared = any(
                    model._base_manager.filter(**{field.attname: item.name}).exists()
                    for model in apps.get_models()
                    for field in model._meta.local_fields
                    if isinstance(field, models.FileField)
                )
                if shared:
                    item.delete()
                    continue
                default_storage.delete(item.name)
            except Exception as exc:
                item.last_error = type(exc).__name__
                item.save(update_fields=['last_error'])
            else:
                item.delete()
