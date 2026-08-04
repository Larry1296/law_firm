from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clients.serializers.admin.compliance_review_serializer import (
    ClientComplianceDecisionSerializer, ClientComplianceReviewSerializer,
)
from apps.clients.services.compliance_review_service import ClientComplianceReviewService


class ClientComplianceReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, client_id):
        review = ClientComplianceReviewService.get_for_client(user=request.user, client_id=client_id)
        return Response({"compliance_review": ClientComplianceReviewSerializer(review).data})

    def put(self, request, client_id):
        serializer = ClientComplianceDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = ClientComplianceReviewService.record(
            user=request.user, client_id=client_id, data=serializer.validated_data,
        )
        return Response({"compliance_review": ClientComplianceReviewSerializer(review).data})
