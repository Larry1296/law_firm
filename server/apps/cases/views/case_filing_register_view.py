from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cases.serializers.case_filing_serializer import CaseFilingCorrectionSerializer, CaseFilingRecordSerializer, CaseFilingSerializer
from apps.cases.models import Case
from apps.cases.services import CaseService
from apps.cases.services.filing_register_service import FilingRegisterService


def scoped_case(user, case_id):
    try:
        return CaseService.get_case(user, case_id)
    except Case.DoesNotExist as exc:
        raise NotFound("Matter not found.") from exc


class CaseFilingRegisterView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, case_id):
        case = scoped_case(request.user, case_id)
        filings = case.filings.order_by("filed_at", "created_at")
        if hasattr(request.user, "client_profile"):
            filings = filings.filter(is_client_visible=True)
        return Response({"filings": CaseFilingSerializer(filings, many=True).data})

    def post(self, request, case_id):
        case = scoped_case(request.user, case_id)
        serializer = CaseFilingRecordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        filing = FilingRegisterService.record(user=request.user, case=case, data=serializer.validated_data)
        case.refresh_from_db()
        return Response(
            {"filing": CaseFilingSerializer(filing).data, "next_action": case.next_action},
            status=status.HTTP_201_CREATED,
        )


class CaseFilingCorrectView(APIView):
    """Corrects one register entry, with a reason, instead of recording it a second time."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, case_id, filing_id):
        case = scoped_case(request.user, case_id)
        filing = case.filings.filter(id=filing_id).first()
        if filing is None:
            raise NotFound("Filing not found.")
        serializer = CaseFilingCorrectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        filing = FilingRegisterService.correct(user=request.user, case=case, filing=filing, data=serializer.validated_data)
        return Response({"filing": CaseFilingSerializer(filing).data})
