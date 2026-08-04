from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cases.models import Case, MatterDeadline, MatterWorkstream
from apps.cases.serializers.matter_operations_serializer import (
    DeadlineChangeSerializer, DeadlineResolveSerializer, LegalAssessmentSerializer, MatterDeadlineSerializer,
    MatterWorkstreamSerializer, WorkstreamStageCompletionSerializer,
)
from apps.cases.services.case_service import CaseService
from apps.cases.services.matter_operations_service import MatterOperationsService


class LegalAssessmentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, case_id):
        matter = CaseService.base_queryset(request.user).get(id=case_id)
        return Response({"assessments": LegalAssessmentSerializer(matter.legal_assessments.all(), many=True).data})

    def post(self, request, case_id):
        serializer = LegalAssessmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = MatterOperationsService.assess(user=request.user, matter_id=case_id, data=serializer.validated_data)
        return Response({"assessment": LegalAssessmentSerializer(record).data}, status=status.HTTP_201_CREATED)


class MatterWorkstreamView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, case_id):
        matter = CaseService.base_queryset(request.user).get(id=case_id)
        record = MatterWorkstream.objects.filter(matter=matter).prefetch_related(
            "stage_records", "stage_records__supporting_documents"
        ).first()
        return Response({"workstream": MatterWorkstreamSerializer(record).data if record else None})

    def post(self, request, case_id):
        serializer = MatterWorkstreamSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = MatterOperationsService.set_workstream(
            user=request.user, matter_id=case_id, workstream_type=serializer.validated_data["workstream_type"],
            stage=serializer.validated_data["current_stage"], stage_data=serializer.validated_data.get("stage_data", {}),
        )
        return Response({"workstream": MatterWorkstreamSerializer(record).data})


class WorkstreamStageCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, case_id):
        serializer = WorkstreamStageCompletionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        stage = MatterOperationsService.complete_workstream_stage(
            user=request.user, matter_id=case_id, **serializer.validated_data
        )
        return Response({"stage": {"id": stage.id, "stage": stage.stage, "completed_at": stage.completed_at}})


class MatterDeadlineView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, case_id):
        firm = CaseService.get_user_firm(request.user)
        records = MatterDeadline.objects.filter(firm=firm, matter_id=case_id).prefetch_related("change_history", "status_history")
        return Response({"deadlines": MatterDeadlineSerializer(records, many=True).data})

    def post(self, request, case_id):
        serializer = MatterDeadlineSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = MatterOperationsService.create_deadline(user=request.user, matter_id=case_id, data=serializer.validated_data)
        return Response({"deadline": MatterDeadlineSerializer(record).data}, status=status.HTTP_201_CREATED)


class DeadlineChangeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, deadline_id):
        serializer = DeadlineChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = MatterOperationsService.change_deadline(user=request.user, deadline_id=deadline_id, **serializer.validated_data)
        return Response({"deadline": MatterDeadlineSerializer(record).data})


class DeadlineResolveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, deadline_id):
        serializer = DeadlineResolveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = MatterOperationsService.resolve_deadline(user=request.user, deadline_id=deadline_id, **serializer.validated_data)
        return Response({"deadline": MatterDeadlineSerializer(record).data})
