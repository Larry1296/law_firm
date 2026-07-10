from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.lawyer.lawyer_calendar_serializer import (
    LawyerCalendarEventSerializer,
)
from apps.staff.services.lawyer.lawyer_calendar_service import LawyerCalendarService
from apps.staff.views.lawyer.lawyer_base_view import LawyerBaseView


class LawyerCalendarView(LawyerBaseView):
    def get(self, request):
        try:
            events = LawyerCalendarService.list_events(request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        serializer = LawyerCalendarEventSerializer(events, many=True)
        return Response(
            {"events": serializer.data},
            status=status.HTTP_200_OK,
        )
