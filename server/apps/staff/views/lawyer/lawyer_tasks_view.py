from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.lawyer.lawyer_task_serializer import LawyerTaskSerializer
from apps.staff.services.lawyer.lawyer_task_service import LawyerTaskService
from apps.staff.views.lawyer.lawyer_base_view import LawyerBaseView


class LawyerTasksView(LawyerBaseView):
    def get(self, request):
        try:
            tasks = LawyerTaskService.list_tasks(request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        serializer = LawyerTaskSerializer(tasks, many=True)
        return Response(
            {"tasks": serializer.data},
            status=status.HTTP_200_OK,
        )
