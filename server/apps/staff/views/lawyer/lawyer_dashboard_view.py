from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.lawyer.lawyer_dashboard_serializer import LawyerDashboardSerializer
from apps.staff.services.lawyer.lawyer_dashboard_service import LawyerDashboardService
from apps.staff.views.lawyer.lawyer_base_view import LawyerBaseView


class LawyerDashboardView(LawyerBaseView):
    def get(self, request):
        try:
            data = LawyerDashboardService.get_dashboard_data(request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        serializer = LawyerDashboardSerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)
