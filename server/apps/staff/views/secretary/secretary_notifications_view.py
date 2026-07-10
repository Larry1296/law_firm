from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.secretary import SecretaryNotificationSerializer
from apps.staff.services.secretary import SecretaryNotificationService
from apps.staff.views.secretary.secretary_base_view import SecretaryBaseView


class SecretaryNotificationsView(SecretaryBaseView):
    def get(self, request):
        try:
            notifications = SecretaryNotificationService.list_notifications(request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        serializer = SecretaryNotificationSerializer(notifications, many=True)
        return Response({"notifications": serializer.data}, status=status.HTTP_200_OK)
