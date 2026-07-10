from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.secretary import SecretaryCalendarSerializer
from apps.staff.services.secretary import SecretaryCalendarService
from apps.staff.views.secretary.secretary_base_view import SecretaryBaseView


class SecretaryCalendarView(SecretaryBaseView):
    def get(self, request):
        try:
            events = SecretaryCalendarService.list_events(request.user)
        except (ValueError, PermissionError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        serializer = SecretaryCalendarSerializer(events, many=True)
        return Response({"events": serializer.data}, status=status.HTTP_200_OK)
