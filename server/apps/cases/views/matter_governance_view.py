from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cases.models import MatterArchive, MatterClosure
from apps.cases.serializers.matter_governance_serializer import (
    DestructionLogSerializer, MatterArchiveSerializer, MatterClosureSerializer,
    ReasonSerializer, RetentionReviewSerializer,
)
from apps.cases.services.matter_governance_service import ArchiveService, GovernanceAccess, MatterClosureService


class MatterClosureView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, case_id):
        firm = GovernanceAccess.firm(request.user)
        records = MatterClosure.objects.filter(firm=firm, matter_id=case_id)
        return Response({"closures": MatterClosureSerializer(records, many=True).data})

    def post(self, request, case_id):
        serializer = MatterClosureSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        closure = MatterClosureService.request(user=request.user, matter_id=case_id, data=serializer.validated_data)
        return Response({"closure": MatterClosureSerializer(closure).data}, status=status.HTTP_201_CREATED)


class MatterClosureActionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, case_id, closure_id, action):
        commands = {
            "approve-advocate": MatterClosureService.approve_advocate,
            "approve-finance": MatterClosureService.approve_finance,
            "finalise": MatterClosureService.finalise,
        }
        if action == "reopen":
            serializer = ReasonSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            closure = MatterClosureService.reopen(user=request.user, closure_id=closure_id, **serializer.validated_data)
        elif action in commands:
            closure = commands[action](user=request.user, closure_id=closure_id)
        else:
            return Response({"detail": "Unknown closure action."}, status=status.HTTP_404_NOT_FOUND)
        if str(closure.matter_id) != str(case_id):
            return Response({"detail": "Closure belongs to another matter."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"closure": MatterClosureSerializer(closure).data})


class MatterArchiveView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, case_id):
        firm = GovernanceAccess.firm(request.user)
        archive = get_object_or_404(MatterArchive, firm=firm, matter_id=case_id)
        return Response({"archive": MatterArchiveSerializer(archive).data})

    def post(self, request, case_id):
        serializer = MatterArchiveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        archive = ArchiveService.archive(user=request.user, matter_id=case_id, data=serializer.validated_data)
        return Response({"archive": MatterArchiveSerializer(archive).data}, status=status.HTTP_201_CREATED)


class RetentionReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, archive_id):
        serializer = RetentionReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = ArchiveService.retention_review(user=request.user, archive_id=archive_id, data=serializer.validated_data)
        return Response({"retention_review": {"id": review.id, "outcome": review.outcome}}, status=status.HTTP_201_CREATED)


class DestructionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, archive_id):
        serializer = DestructionLogSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = ArchiveService.destroy(user=request.user, archive_id=archive_id, data=serializer.validated_data)
        return Response({"destruction_log": {"id": record.id, "matter_reference": record.matter_reference}}, status=status.HTTP_201_CREATED)
