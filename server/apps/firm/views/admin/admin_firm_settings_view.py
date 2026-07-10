from rest_framework.response import Response

from apps.firm.services.firm_settings_service import FirmSettingService
from apps.firm.serializers.firm_settings_serializer import FirmSettingSerializer
from apps.firm.views.admin.admin_firm_base_view import AdminFirmBaseView


class AdminFirmSettingsView(AdminFirmBaseView):
    def get(self, request):
        firm = self.get_firm()
        settings = FirmSettingService.get_settings(firm)
        serializer = FirmSettingSerializer(settings)
        return Response(serializer.data)

    def patch(self, request):
        firm = self.get_firm()
        settings = FirmSettingService.get_settings(firm)

        serializer = FirmSettingSerializer(
            settings,
            data=request.data,
            partial=True
        )

        serializer.is_valid(raise_exception=True)
        updated = FirmSettingService.update_settings(
            firm=firm,
            validated_data=serializer.validated_data
        )

        return Response(FirmSettingSerializer(updated).data)
