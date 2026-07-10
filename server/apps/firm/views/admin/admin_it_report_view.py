from rest_framework.response import Response

from apps.firm.services.it_system_report_service import ITSystemReportService
from apps.firm.views.admin.admin_firm_base_view import AdminFirmBaseView


class AdminITReportView(AdminFirmBaseView):
    def get(self, request):
        firm = self.get_firm()
        return Response(ITSystemReportService.build_report(firm))

