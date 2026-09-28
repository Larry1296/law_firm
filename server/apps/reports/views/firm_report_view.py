from rest_framework.response import Response

from apps.firm.views.admin.admin_firm_base_view import AdminFirmBaseView
from apps.reports.services.firm_report_service import FirmReportService


class FirmReportView(AdminFirmBaseView):
    def get(self, request):
        return Response(FirmReportService.build(self.get_firm()))
