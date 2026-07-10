from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.lawyer.lawyer_notification_serializer import (
    LawyerNotificationSerializer,
)
from apps.staff.services.lawyer.lawyer_notification_service import LawyerNotificationService
from apps.staff.views.lawyer.lawyer_base_view import LawyerBaseView


class LawyerNotificationsView(LawyerBaseView):
    def get(self, request):
        try:
            notifications = LawyerNotificationService.list_notifications(request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        serializer = LawyerNotificationSerializer(notifications, many=True)
        return Response({"notifications": serializer.data}, status=status.HTTP_200_OK)
