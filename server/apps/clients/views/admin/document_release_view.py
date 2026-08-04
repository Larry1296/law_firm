from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cases.services.case_service import CaseService
from apps.clients.models import DocumentReleaseRequest
from apps.clients.serializers.admin.document_release_serializer import (
    DocumentReleaseCompleteSerializer, DocumentReleaseCreateSerializer,
    DocumentReleaseDecisionSerializer, DocumentReleaseRequestSerializer,
)
from apps.clients.services.document_release_service import DocumentReleaseService


class DocumentReleaseListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, client_id, document_id):
        firm = CaseService.get_user_firm(request.user)
        records = DocumentReleaseRequest.objects.filter(
            firm=firm, document_id=document_id, document__client_id=client_id
        ).order_by("-requested_at")
        return Response({"release_requests": DocumentReleaseRequestSerializer(records, many=True).data})

    def post(self, request, client_id, document_id):
        serializer = DocumentReleaseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = DocumentReleaseService.request(
            user=request.user, client_id=client_id, document_id=document_id,
            matter_id=serializer.validated_data.pop("matter"), **serializer.validated_data
        )
        return Response({"release_request": DocumentReleaseRequestSerializer(record).data},
                        status=status.HTTP_201_CREATED)


class DocumentReleaseDecisionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, client_id, document_id, release_id):
        firm = CaseService.get_user_firm(request.user)
        if not DocumentReleaseRequest.objects.filter(
            id=release_id, firm=firm, document_id=document_id, document__client_id=client_id
        ).exists():
            from rest_framework.exceptions import NotFound
            raise NotFound()
        serializer = DocumentReleaseDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = DocumentReleaseService.decide(user=request.user, release_id=release_id,
                                               **serializer.validated_data)
        return Response({"release_request": DocumentReleaseRequestSerializer(record).data})


class DocumentReleaseCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, client_id, document_id, release_id):
        firm = CaseService.get_user_firm(request.user)
        if not DocumentReleaseRequest.objects.filter(
            id=release_id, firm=firm, document_id=document_id, document__client_id=client_id
        ).exists():
            from rest_framework.exceptions import NotFound
            raise NotFound()
        serializer = DocumentReleaseCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = DocumentReleaseService.release(user=request.user, release_id=release_id,
                                                **serializer.validated_data)
        return Response({"release_request": DocumentReleaseRequestSerializer(record).data})
