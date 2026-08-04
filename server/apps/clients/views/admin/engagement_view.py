from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clients.serializers.admin.engagement_serializer import (
    EngagementCreateSerializer, EngagementExceptionSerializer, EngagementRecordSerializer,
    EngagementSupersedeSerializer,
)
from apps.clients.services.conflict import ClientMatterConflictService
from apps.clients.services.engagement_service import EngagementService


class EngagementListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def _proposal(self, request, client_id, check_id):
        return ClientMatterConflictService.get_check(user=request.user, client_id=client_id, check_id=check_id)

    def get(self, request, client_id, check_id):
        proposal = self._proposal(request, client_id, check_id)
        records = proposal.engagements.select_related("responsible_advocate", "approved_by", "exception_approved_by")
        return Response({"engagements": EngagementRecordSerializer(records, many=True).data})

    def post(self, request, client_id, check_id):
        proposal = self._proposal(request, client_id, check_id)
        serializer = EngagementCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = EngagementService.create(user=request.user, proposed_matter=proposal, data=serializer.validated_data)
        return Response({"engagement": EngagementRecordSerializer(record).data}, status=status.HTTP_201_CREATED)


class EngagementApproveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, client_id, check_id, engagement_id):
        ClientMatterConflictService.get_check(user=request.user, client_id=client_id, check_id=check_id)
        record = EngagementService.approve(
            user=request.user, engagement_id=engagement_id, proposed_matter_id=check_id
        )
        return Response({"engagement": EngagementRecordSerializer(record).data})


class EngagementExceptionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, client_id, check_id, engagement_id):
        ClientMatterConflictService.get_check(user=request.user, client_id=client_id, check_id=check_id)
        serializer = EngagementExceptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = EngagementService.approve_exception(
            user=request.user, engagement_id=engagement_id, proposed_matter_id=check_id,
            **serializer.validated_data
        )
        return Response({"engagement": EngagementRecordSerializer(record).data})


class EngagementSupersedeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, client_id, check_id, engagement_id):
        ClientMatterConflictService.get_check(user=request.user, client_id=client_id, check_id=check_id)
        serializer = EngagementSupersedeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = EngagementService.supersede(
            user=request.user, engagement_id=engagement_id, proposed_matter_id=check_id,
            reason=serializer.validated_data["reason"],
        )
        return Response({"engagement": EngagementRecordSerializer(record).data})
