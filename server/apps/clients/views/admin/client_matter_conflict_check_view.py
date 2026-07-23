from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clients.serializers.admin.client_matter_conflict_check_serializer import (
    ClearedUnconsumedConflictCheckSerializer,
    ClientMatterConflictCheckDetailSerializer,
    ClientMatterConflictCheckListSerializer,
    CloseWithoutDecisionSerializer,
    EscalationSerializer,
    FinalDecisionSerializer,
    PotentialConflictSerializer,
    ProposedMatterSerializer,
    RequestInformationSerializer,
    ResumeCheckSerializer,
    StartCheckSerializer,
)
from apps.clients.services.conflict import ClientMatterConflictService
from apps.common.choices import ConflictCheckStatus


class ClientMatterConflictCheckListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, client_id):
        try:
            checks = ClientMatterConflictService.list_for_client(
                user=request.user,
                client_id=client_id,
            )
        except (PermissionDenied, ValidationError) as exc:
            status_code = status.HTTP_403_FORBIDDEN if isinstance(exc, PermissionDenied) else status.HTTP_400_BAD_REQUEST
            return Response({"detail": str(exc.detail if hasattr(exc, "detail") else exc)}, status=status_code)
        return Response(
            {"conflict_checks": ClientMatterConflictCheckListSerializer(checks, many=True).data},
            status=status.HTTP_200_OK,
        )

    def post(self, request, client_id):
        serializer = ProposedMatterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        check = ClientMatterConflictService.create_proposed_matter(
            user=request.user,
            client_id=client_id,
            data=serializer.validated_data,
        )
        return Response(
            {"conflict_check": ClientMatterConflictCheckDetailSerializer(check).data},
            status=status.HTTP_201_CREATED,
        )


class ClientMatterConflictCheckDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, client_id, check_id):
        check = ClientMatterConflictService.get_check(
            user=request.user,
            client_id=client_id,
            check_id=check_id,
        )
        return Response(
            {"conflict_check": ClientMatterConflictCheckDetailSerializer(check).data},
            status=status.HTTP_200_OK,
        )

    def patch(self, request, client_id, check_id):
        serializer = ProposedMatterSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        check = ClientMatterConflictService.update_proposed_matter(
            user=request.user,
            client_id=client_id,
            check_id=check_id,
            data=serializer.validated_data,
        )
        return Response(
            {"conflict_check": ClientMatterConflictCheckDetailSerializer(check).data},
            status=status.HTTP_200_OK,
        )


class ClientMatterConflictCheckClearedUnconsumedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, client_id):
        checks = ClientMatterConflictService.list_for_client(
            user=request.user,
            client_id=client_id,
        ).filter(
            status=ConflictCheckStatus.CLEARED,
            created_case__isnull=True,
            consumed_at__isnull=True,
        )
        return Response(
            {"conflict_checks": ClearedUnconsumedConflictCheckSerializer(checks, many=True).data},
            status=status.HTTP_200_OK,
        )


class ClientMatterConflictCheckActionView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = None
    command = None

    def post(self, request, client_id, check_id):
        serializer = self.serializer_class(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        check = self.command(
            user=request.user,
            client_id=client_id,
            check_id=check_id,
            data=serializer.validated_data,
        )
        return Response(
            {"conflict_check": ClientMatterConflictCheckDetailSerializer(check).data},
            status=status.HTTP_200_OK,
        )


class ClientMatterConflictCheckStartView(ClientMatterConflictCheckActionView):
    serializer_class = StartCheckSerializer
    command = staticmethod(ClientMatterConflictService.start_check)


class ClientMatterConflictCheckRequestInformationView(ClientMatterConflictCheckActionView):
    serializer_class = RequestInformationSerializer
    command = staticmethod(ClientMatterConflictService.request_information)


class ClientMatterConflictCheckResumeView(ClientMatterConflictCheckActionView):
    serializer_class = ResumeCheckSerializer
    command = staticmethod(ClientMatterConflictService.resume_check)


class ClientMatterConflictCheckPotentialView(ClientMatterConflictCheckActionView):
    serializer_class = PotentialConflictSerializer
    command = staticmethod(ClientMatterConflictService.record_potential_conflict)


class ClientMatterConflictCheckEscalateView(ClientMatterConflictCheckActionView):
    serializer_class = EscalationSerializer
    command = staticmethod(ClientMatterConflictService.escalate_for_review)


class ClientMatterConflictCheckDecideView(ClientMatterConflictCheckActionView):
    serializer_class = FinalDecisionSerializer
    command = staticmethod(ClientMatterConflictService.record_final_decision)


class ClientMatterConflictCheckCloseView(ClientMatterConflictCheckActionView):
    serializer_class = CloseWithoutDecisionSerializer
    command = staticmethod(ClientMatterConflictService.close_without_decision)
