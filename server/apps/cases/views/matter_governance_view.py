from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cases.models import MatterArchive, MatterClosure
from apps.cases.serializers.matter_governance_serializer import (
    ArchiveAccessSerializer, DestructionLogSerializer, GenerateClosingDocumentSerializer,
    LegalHoldSerializer, MatterArchiveSerializer, MatterClosureSerializer, ReasonSerializer,
    RetentionReviewSerializer,
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
        firm = GovernanceAccess.firm(request.user)
        if not MatterClosure.objects.filter(id=closure_id, matter_id=case_id, firm=firm).exists():
            return Response({"detail": "Closure not found for this matter."}, status=status.HTTP_404_NOT_FOUND)
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
        return Response({"closure": MatterClosureSerializer(closure).data})


class ClosingDocumentGenerateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, case_id, closure_id):
        firm = GovernanceAccess.firm(request.user)
        if not MatterClosure.objects.filter(id=closure_id, matter_id=case_id, firm=firm).exists():
            return Response({"detail": "Closure not found for this matter."}, status=status.HTTP_404_NOT_FOUND)
        serializer = GenerateClosingDocumentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        generated = MatterClosureService.generate_document(user=request.user, closure_id=closure_id, **serializer.validated_data)
        return Response({
            "generated_document": {"id": generated.id, "document_type": generated.document_type,
                                   "version": generated.version, "client_document": generated.client_document_id}
        }, status=status.HTTP_201_CREATED)


class MatterArchiveView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, case_id):
        firm = GovernanceAccess.firm(request.user)
        candidate = get_object_or_404(MatterArchive, firm=firm, matter_id=case_id)
        serializer = ArchiveAccessSerializer(data={"purpose": request.query_params.get("purpose", "")})
        serializer.is_valid(raise_exception=True)
        archive, access = ArchiveService.access(user=request.user, archive_id=candidate.id, **serializer.validated_data)
        return Response({"archive": MatterArchiveSerializer(archive).data, "access_log_id": access.id})

    def post(self, request, case_id):
        serializer = MatterArchiveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        archive = ArchiveService.archive(user=request.user, matter_id=case_id, data=serializer.validated_data)
        return Response({"archive": MatterArchiveSerializer(archive).data}, status=status.HTTP_201_CREATED)


class RetentionReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, archive_id):
        firm = GovernanceAccess.firm(request.user)
        archive = get_object_or_404(MatterArchive, id=archive_id, firm=firm)
        return Response({"retention_reviews": RetentionReviewSerializer(
            archive.retention_reviews.all(), many=True
        ).data})

    def post(self, request, archive_id):
        serializer = RetentionReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = ArchiveService.retention_review(user=request.user, archive_id=archive_id, data=serializer.validated_data)
        return Response({"retention_review": {"id": review.id, "outcome": review.outcome}}, status=status.HTTP_201_CREATED)


class DestructionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, archive_id):
        firm = GovernanceAccess.firm(request.user)
        archive = get_object_or_404(MatterArchive, id=archive_id, firm=firm)
        try:
            record = archive.destruction_log
        except Exception:
            return Response({"destruction_log": None})
        return Response({"destruction_log": DestructionLogSerializer(record).data})

    def post(self, request, archive_id):
        serializer = DestructionLogSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = ArchiveService.destroy(user=request.user, archive_id=archive_id, data=serializer.validated_data)
        return Response({"destruction_log": {"id": record.id, "matter_reference": record.matter_reference}}, status=status.HTTP_201_CREATED)


class LegalHoldView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, archive_id):
        serializer = LegalHoldSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        archive = ArchiveService.legal_hold(user=request.user, archive_id=archive_id, **serializer.validated_data)
        return Response({"archive": MatterArchiveSerializer(archive).data})
