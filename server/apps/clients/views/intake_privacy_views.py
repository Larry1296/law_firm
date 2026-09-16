from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied, MethodNotAllowed
from rest_framework.response import Response
from apps.clients.models import IntakePrivacyConfig, ClientPrivacyRecord
from apps.clients.services.intake_privacy_service import create_config, transition_config
from apps.firm.views.admin.admin_firm_base_view import AdminFirmBaseView
from apps.audit_logs.services import AuditService


class PrivacyConfigSerializer(serializers.ModelSerializer):
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True, default=None)
    activated_by_name = serializers.CharField(source='activated_by.full_name', read_only=True, default=None)
    retired_by_name = serializers.CharField(source='retired_by.full_name', read_only=True, default=None)
    lawful_basis_label = serializers.CharField(source='get_lawful_basis_display', read_only=True)

    class Meta:
        model = IntakePrivacyConfig
        fields = ['id', 'policy_version', 'notice_text', 'lawful_basis', 'lawful_basis_label', 'effective_date', 'status',
                  'approved_by', 'approved_at', 'activated_by', 'activated_at', 'retired_by', 'retired_at',
                  'approved_by_name', 'activated_by_name', 'retired_by_name']
        extra_kwargs = {'effective_date': {'required': True}}
        read_only_fields = ['id', 'status', 'approved_by', 'approved_at', 'activated_by', 'activated_at', 'retired_by', 'retired_at']

    def to_internal_value(self, data):
        if not isinstance(data, dict):
            raise serializers.ValidationError({'non_field_errors': ['Expected an object.']})
        if set(data) - {'policy_version', 'notice_text', 'lawful_basis', 'effective_date'}:
            raise serializers.ValidationError({'non_field_errors': ['Only version, notice text, lawful basis and effective date may be supplied.']})
        return super().to_internal_value(data)


class IntakePrivacyConfigView(AdminFirmBaseView):
    def get_firm(self):
        if not self.request.user.is_active:
            raise PermissionDenied('An active administrator account is required.')
        return super().get_firm()

    def get(self, request, pk=None, action=None):
        if pk is not None:
            raise MethodNotAllowed('GET')
        firm = self.get_firm()
        configs = IntakePrivacyConfig.objects.filter(firm=firm).select_related('approved_by', 'activated_by', 'retired_by').order_by('-id')
        AuditService.record(firm=firm, user=request.user, action='INTAKE_PRIVACY_LISTED', obj=firm)
        return Response({'results': PrivacyConfigSerializer(configs, many=True).data,
                         'lawful_bases': [{'value': value, 'label': label} for value, label in ClientPrivacyRecord.LawfulBasis.choices]})

    def post(self, request, pk=None, action=None):
        firm = self.get_firm()
        if pk is not None:
            if request.data:
                raise serializers.ValidationError('Lifecycle actions do not accept configuration changes.')
            config = transition_config(firm=firm, user=request.user, pk=pk, action=action)
        else:
            serializer = PrivacyConfigSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            config = create_config(firm=firm, user=request.user, data=serializer.validated_data)
        return Response(PrivacyConfigSerializer(config).data, status=200 if pk else 201)
