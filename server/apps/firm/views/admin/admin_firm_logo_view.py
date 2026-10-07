from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.audit_logs.services import AuditService
from apps.authentication.services.auth_service import AuthService
from apps.firm.serializers.logo_serializer import LogoSerializer
from apps.firm.views.admin.admin_firm_base_view import AdminFirmBaseView


class AdminFirmLogoView(AdminFirmBaseView):
    """The firm administrator uploads or removes the firm's logo."""

    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        firm = self.get_firm()
        serializer = LogoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        previous = firm.logo.name or None
        firm.logo = serializer.validated_data["logo"]
        firm.save(update_fields=["logo", "updated_at"])
        AuditService.record(
            firm=firm, user=request.user, action="FIRM_LOGO_UPDATED", obj=firm,
            previous={"logo": previous}, new={"logo": firm.logo.name},
        )
        return Response({"firm": AuthService.firm_payload(firm)})

    def delete(self, request):
        firm = self.get_firm()
        previous = firm.logo.name or None
        if previous:
            # The file stays in storage, so a removed logo can be restored.
            firm.logo = None
            firm.save(update_fields=["logo", "updated_at"])
            AuditService.record(
                firm=firm, user=request.user, action="FIRM_LOGO_REMOVED", obj=firm,
                previous={"logo": previous}, new={"logo": None},
            )
        return Response({"firm": AuthService.firm_payload(firm)})
