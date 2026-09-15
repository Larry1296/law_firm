from datetime import timedelta
from zoneinfo import ZoneInfo

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.audit_logs.services.audit_service import AuditService, _json_value
from apps.clients.models import (WalkInEnquiry, WalkInEnquirySequence, WalkInEnquiryCorrection,
                                 WalkInNoticeDelivery, WalkInPrivacyConfig)
from apps.clients.serializers.walk_in_enquiry_serializer import WalkInEnquirySerializer, EDITABLE_FIELDS
from apps.clients.services.walk_in_privacy_service import privacy_notice, WalkInPrivacyConfigSerializer
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.staff.services.secretary import SecretaryClientService
from apps.users.models import User


class WalkInEnquiryService:
    @staticmethod
    def firm_for(user, workspace=None):
        # Re-read authority rather than relying on cached reverse profiles or token claims.
        current = User.objects.get(pk=user.pk)
        if not current.is_active:
            raise PermissionDenied('Active client-intake authority is required.')
        if workspace not in (None, 'admin', 'secretary'):
            raise PermissionDenied('Unknown intake workspace.')
        if current.role == UserRole.ADMIN and workspace in (None, 'admin'):
            firm = LawFirm.objects.filter(owner=current, is_active=True).first()
            if firm:
                return firm
        if current.role == UserRole.STAFF and workspace in (None, 'secretary'):
            try:
                secretary = SecretaryClientService.ensure_can_manage_clients(current)
            except (ValueError, PermissionError) as exc:
                raise PermissionDenied(str(exc)) from exc
            if secretary.can_manage_client_intake and secretary.law_firm.is_active:
                return secretary.law_firm
        raise PermissionDenied('This endpoint requires the matching active intake role.')

    @classmethod
    def list(cls, *, user, workspace=None):
        return WalkInEnquiry.objects.filter(firm=cls.firm_for(user, workspace)).select_related('received_by', 'preliminary_review')

    @classmethod
    @transaction.atomic
    def configure_notice(cls, *, user, data, workspace):
        firm = cls.firm_for(user, workspace)
        if workspace != 'admin':
            raise PermissionDenied('Only the firm owner may configure intake privacy.')
        LawFirm.objects.select_for_update().get(pk=firm.pk)
        serializer = WalkInPrivacyConfigSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        existing = WalkInPrivacyConfig.objects.filter(firm=firm).first()
        if existing and existing.policy_version == serializer.validated_data['policy_version']:
            raise ValidationError({'policy_version': 'Use a new policy version when updating the notice.'})
        config, _ = WalkInPrivacyConfig.objects.update_or_create(firm=firm, defaults={
            **serializer.validated_data, 'approved_by': user, 'approved_at': timezone.now(),
        })
        AuditService.record(firm=firm, user=user, action='WALK_IN_PRIVACY_CONFIGURED', obj=config)
        return privacy_notice(firm)

    @classmethod
    @transaction.atomic
    def deliver_notice(cls, *, user, data, workspace=None):
        firm = cls.firm_for(user, workspace)
        firm = LawFirm.objects.select_for_update().get(pk=firm.pk)
        notice = privacy_notice(firm)
        if not notice['ready']:
            raise ValidationError({'privacy_notice': 'Firm privacy-notice configuration is incomplete.'})
        class DeliveryInput(serializers.Serializer):
            version = serializers.CharField(max_length=120)
            method = serializers.ChoiceField(choices=WalkInNoticeDelivery.Method.choices)
            acknowledged = serializers.BooleanField()
        serializer = DeliveryInput(data=data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        if values['version'] != notice['notice']['version']:
            raise ValidationError({'privacy_notice': 'Notice changed. Reload and deliver the current notice.'})
        if not values['acknowledged']:
            raise ValidationError({'privacy_acknowledged': 'The visitor must acknowledge the privacy notice.'})
        receipt = WalkInNoticeDelivery.objects.create(firm=firm, actor=user,
            version=values['version'], snapshot=notice['notice'], method=values['method'], delivered_at=timezone.now())
        AuditService.record(firm=firm, user=user, action='WALK_IN_NOTICE_DELIVERED', obj=receipt)
        return receipt

    @classmethod
    @transaction.atomic
    def create(cls, *, user, data, workspace=None):
        firm = cls.firm_for(user, workspace)
        firm = LawFirm.objects.select_for_update().get(pk=firm.pk)
        notice = privacy_notice(firm)
        if not notice['ready']:
            raise ValidationError({'privacy_notice': 'Firm privacy-notice configuration is incomplete.'})
        serializer = WalkInEnquirySerializer(data=data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        receipt_id = values.pop('notice_receipt', None)
        receipt = WalkInNoticeDelivery.objects.select_for_update().filter(
            pk=receipt_id, firm=firm, actor=user, acknowledged=True).first()
        now = timezone.now()
        if (not receipt or WalkInEnquiry.objects.filter(notice_delivery=receipt).exists() or receipt.version != notice['notice']['version'] or
                not now - timedelta(hours=24) <= receipt.delivered_at <= now):
            raise ValidationError({'notice_receipt': 'Deliver and acknowledge the current privacy notice before entering personal data. Receipts are single-use and valid for 24 hours.'})
        year = now.astimezone(ZoneInfo('Africa/Nairobi')).year
        sequence, _ = WalkInEnquirySequence.objects.get_or_create(firm=firm, year=year)
        reference = f'ENQ-{year}-{sequence.next_number:05d}'
        sequence.next_number += 1
        sequence.save(update_fields=['next_number'])
        values.setdefault('received_at', now)
        enquiry = WalkInEnquiry.objects.create(firm=firm, received_by=user, reference=reference,
            notice_delivery=receipt, notice_version=receipt.version, notice_snapshot=receipt.snapshot,
            notice_delivery_method=receipt.method, notice_delivered_at=receipt.delivered_at, **values)
        # No names, descriptions, category, dates, contact details or free-text reasons in logs.
        AuditService.record(firm=firm, user=user, action='WALK_IN_ENQUIRY_RECORDED', obj=enquiry,
                            new={'revision': 0, 'received_time_overridden': 'received_at' in data})
        if 'received_at' in data:
            AuditService.record(firm=firm, user=user, action='WALK_IN_RECEIVED_TIME_OVERRIDDEN', obj=enquiry)
        return enquiry

    @classmethod
    def history(cls, *, user, enquiry_id, workspace):
        enquiry = get_object_or_404(cls.list(user=user, workspace=workspace), pk=enquiry_id)
        return enquiry.corrections.select_related('actor').all()

    @classmethod
    @transaction.atomic
    def correct(cls, *, user, enquiry_id, data, workspace):
        firm = cls.firm_for(user, workspace)
        if workspace != 'admin':
            raise PermissionDenied('Only the firm owner may correct a recorded enquiry.')
        enquiry = get_object_or_404(WalkInEnquiry.objects.select_for_update(), pk=enquiry_id, firm=firm)
        class CorrectionInput(serializers.Serializer):
            reason = serializers.CharField(max_length=500, allow_blank=False)
            revision = serializers.IntegerField(min_value=0)
            changes = serializers.DictField(allow_empty=False)
        request = CorrectionInput(data=data)
        request.is_valid(raise_exception=True)
        values = request.validated_data
        if values['revision'] != enquiry.revision:
            raise ValidationError({'revision': 'This enquiry changed. Reload before correcting it.'})
        changes = values['changes']
        if set(changes) - set(EDITABLE_FIELDS):
            raise ValidationError({'changes': 'Only capture fields may be corrected. Notice evidence and server fields are immutable.'})
        merged = {field: getattr(enquiry, field) for field in EDITABLE_FIELDS}
        merged.update(changes)
        # Existing received time does not become an override just because another field is corrected.
        if 'received_at' not in changes:
            merged.pop('received_at')
        else:
            merged['received_at_reason'] = values['reason']
        merged['privacy_acknowledged'] = enquiry.privacy_acknowledged
        serializer = WalkInEnquirySerializer(data=merged)
        serializer.is_valid(raise_exception=True)
        replacement = {field: value for field, value in serializer.validated_data.items()
                       if field in EDITABLE_FIELDS + ['visitor_type'] and value != getattr(enquiry, field)}
        if not replacement:
            raise ValidationError({'changes': 'There are no changed values to record.'})
        previous = {field: getattr(enquiry, field) for field in replacement}
        enquiry.revision += 1
        history = WalkInEnquiryCorrection.objects.create(enquiry=enquiry, actor=user, reason=values['reason'],
            previous_values=_json_value(previous), replacement_values=_json_value(replacement), revision=enquiry.revision)
        for field, value in replacement.items():
            setattr(enquiry, field, value)
        enquiry.save(update_fields=[*replacement, 'revision', 'updated_at'])
        AuditService.record(firm=firm, user=user, action='WALK_IN_ENQUIRY_CORRECTED', obj=enquiry,
                            new={'revision': enquiry.revision, 'history_id': str(history.pk), 'fields': sorted(replacement)})
        return enquiry
