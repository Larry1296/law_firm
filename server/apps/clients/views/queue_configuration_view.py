from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.response import Response

from apps.audit_logs.services import AuditService
from apps.clients.models import ClientVisit
from apps.clients.views.client_visit_views import active_staff, notify_reception, reception_mode
from apps.firm.models import FirmSetting, LawFirm
from apps.firm.views.admin.admin_firm_base_view import AdminFirmBaseView
from apps.staff.models import Lawyer, Secretary


class OfficeInput(serializers.Serializer):
    advocate = serializers.UUIDField()
    office_location = serializers.CharField(max_length=255, allow_blank=True)


class CoverageInput(serializers.Serializer):
    secretary = serializers.UUIDField()
    advocates = serializers.ListField(child=serializers.UUIDField(), allow_empty=True)


class ConfigurationInput(serializers.Serializer):
    reception_mode = serializers.ChoiceField(choices=['SHARED', 'ASSIGNED'], required=False)
    offices = OfficeInput(many=True, required=False)
    secretary_assignments = CoverageInput(many=True, required=False)


class QueueConfigurationView(AdminFirmBaseView):
    def get(self, request):
        firm = self.get_firm()
        return Response(self.configuration(firm))

    @staticmethod
    def configuration(firm):
        lawyers = active_staff(Lawyer).filter(law_firm=firm).select_related('user', 'branch')
        secretaries = active_staff(Secretary).filter(law_firm=firm, can_manage_client_intake=True).select_related('user').prefetch_related('assigned_lawyers')
        return {
            'reception_mode': reception_mode(firm),
            'advocates': [{'id': str(x.pk), 'name': x.user.full_name, 'office_location': x.office_location or '',
                          'branch': x.branch.name if x.branch_id else ''} for x in lawyers],
            'secretaries': [{'id': str(x.pk), 'name': x.user.full_name, 'is_receptionist': x.is_receptionist,
                            'advocates': [str(y.pk) for y in x.assigned_lawyers.all()]} for x in secretaries],
        }

    @transaction.atomic
    def patch(self, request):
        firm = self.get_firm()
        LawFirm.objects.select_for_update().get(pk=firm.pk)
        serializer = ConfigurationInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        for item in values.get('offices', []):
            lawyer = get_object_or_404(Lawyer.objects.select_for_update(), pk=item['advocate'], law_firm=firm)
            before = lawyer.office_location
            if not item['office_location'] and ClientVisit.objects.filter(advocate=lawyer, status='CALLED').exists():
                raise serializers.ValidationError('Assign a replacement room before clearing an office with a called client.')
            lawyer.office_location = item['office_location']
            lawyer.save(update_fields=['office_location', 'updated_at'])
            AuditService.record(firm=firm, user=request.user, action='ADVOCATE_OFFICE_CHANGED', obj=lawyer,
                previous={'office_location': before}, new={'office_location': lawyer.office_location})
        for item in values.get('secretary_assignments', []):
            secretary = get_object_or_404(Secretary, pk=item['secretary'], law_firm=firm)
            lawyers = list(Lawyer.objects.filter(pk__in=item['advocates'], law_firm=firm))
            if len(lawyers) != len(set(item['advocates'])):
                raise serializers.ValidationError('Choose advocates from this firm only.')
            secretary.assigned_lawyers.set(lawyers)
            AuditService.record(firm=firm, user=request.user, action='QUEUE_SECRETARY_COVERAGE_CHANGED', obj=secretary,
                                new={'advocates': [str(x.pk) for x in lawyers]})
        if 'reception_mode' in values:
            setting, _ = FirmSetting.objects.get_or_create(firm=firm)
            setting.queue_reception_mode = values['reception_mode']
            setting.save(update_fields=['queue_reception_mode', 'updated_at'])
            AuditService.record(firm=firm, user=request.user, action='QUEUE_RECEPTION_MODE_CHANGED', obj=setting,
                                new={'reception_mode': setting.queue_reception_mode})
        for visit in ClientVisit.objects.filter(firm=firm, status='CALLED').select_related('advocate__user', 'advocate__branch'):
            notify_reception(visit, request.user)
        return Response(self.configuration(firm))
