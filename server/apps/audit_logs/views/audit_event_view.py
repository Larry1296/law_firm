from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit_logs.models import AuditEvent
from apps.audit_logs.serializers import AuditEventSerializer
from apps.cases.services.case_service import CaseService
from apps.common.choices import UserRole


class AuditEventListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        firm = CaseService.get_user_firm(request.user)
        permitted = request.user.role == UserRole.ADMIN and firm.owner_id == request.user.id
        it_profile = getattr(request.user, "it_profile", None)
        permitted = permitted or bool(it_profile and it_profile.law_firm_id == firm.id and it_profile.is_active and it_profile.can_access_audit_logs)
        if not permitted:
            raise PermissionDenied("Audit-log access is restricted.")
        events = AuditEvent.objects.filter(firm=firm).select_related("user")
        for parameter in ("object_type", "object_identifier", "action"):
            value = request.query_params.get(parameter)
            if value:
                events = events.filter(**{parameter: value})
        return Response({"audit_events": AuditEventSerializer(events[:500], many=True).data})
