from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.secretary import SecretaryTaskSerializer
from apps.staff.services.secretary import SecretaryTaskService
from apps.staff.views.secretary.secretary_base_view import SecretaryBaseView


class SecretaryTasksView(SecretaryBaseView):
    def get(self, request):
        try:
            tasks = SecretaryTaskService.list_tasks(request.user)
        except (ValueError, PermissionError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        serializer = SecretaryTaskSerializer(tasks, many=True)
        return Response({"tasks": serializer.data}, status=status.HTTP_200_OK)
