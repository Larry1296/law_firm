from django.core.exceptions import ObjectDoesNotExist
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cases.models import CaseTask
from apps.cases.serializers.case_task_serializer import CaseTaskCreateSerializer, CaseTaskSerializer
from apps.cases.services import CaseService


class CaseTaskListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, case_id):
        try:
            case = CaseService.get_case(request.user, case_id)
        except ObjectDoesNotExist:
            return Response({"detail": "Matter not found."}, status=status.HTTP_404_NOT_FOUND)
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        if not case.assigned_lawyer_id or not case.assigned_lawyer.user_id:
            return Response({"assigned_to": "Assign an advocate before creating an internal task."}, status=400)
        serializer = CaseTaskCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        task = CaseTask.objects.create(
            case=case,
            assigned_to=case.assigned_lawyer.user,
            created_by=request.user,
            **serializer.validated_data,
        )
        return Response({"task": CaseTaskSerializer(task).data}, status=status.HTTP_201_CREATED)
