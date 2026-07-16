from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.services import NotificationService


class MarkAllNotificationsReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        updated = NotificationService.mark_all_read(request.user)
        return Response(
            {
                "updated": updated,
                "unread_count": NotificationService.unread_count(request.user),
            }
        )
