from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.serializers import NotificationSerializer
from apps.notifications.services import NotificationService


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        unread_only = request.query_params.get("unread") in {"1", "true", "True"}
        notifications = NotificationService.list_for_user(
            request.user,
            unread_only=unread_only,
        )
        return Response(
            {
                "notifications": NotificationSerializer(notifications, many=True).data,
                "unread_count": NotificationService.unread_count(request.user),
            }
        )
