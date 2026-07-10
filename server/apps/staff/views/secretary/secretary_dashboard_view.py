from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.secretary import SecretaryDashboardSerializer
from apps.staff.services.secretary import SecretaryDashboardService
from apps.staff.views.secretary.secretary_base_view import SecretaryBaseView


class SecretaryDashboardView(SecretaryBaseView):
    def get(self, request):
        try:
            data = SecretaryDashboardService.get_dashboard_data(request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        serializer = SecretaryDashboardSerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)
