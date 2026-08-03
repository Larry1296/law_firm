from django.core.exceptions import ObjectDoesNotExist
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai.serializers import GenerateCaseAssessmentSerializer
from apps.ai.services.case_assessment_service import CaseAssessmentService, DISCLAIMER
from apps.ai.views.lawyer_case_assessment_view import _assessment_payload


class MatterIntelligencePagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


class AdminMatterIntelligenceListView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        try:
            matters = CaseAssessmentService.list_priorities(request.user, request.query_params, scope="firm")
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=403)
        paginator = MatterIntelligencePagination()
        page = paginator.paginate_queryset(matters, request)
        response = paginator.get_paginated_response(page)
        response.data.update({"disclaimer": DISCLAIMER, "methodology": {"outlook_policy": "Outcome ranges are withheld unless sufficiently similar, verified comparable data supports them.", "scoring_version": "preparedness-v1"}})
        return response


class AdminMatterIntelligenceDetailView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, matter_id):
        try:
            case = CaseAssessmentService.authorized_cases(request.user, scope="firm").get(id=matter_id)
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=403)
        except ObjectDoesNotExist:
            return Response({"detail": "Matter not found."}, status=404)
        current = case.ai_assessments.order_by("-version").first()
        return Response({"matter": CaseAssessmentService.summary(case), "assessment": _assessment_payload(current) if current else None, "history": [_assessment_payload(item, history=True) for item in case.ai_assessments.order_by("-version")[:20]], "available_documents": [{"id": str(item.id), "title": item.title, "type": item.get_attachment_type_display(), "reference": item.document_reference, "confidential": item.is_confidential} for item in case.attachments.all()], "disclaimer": DISCLAIMER})


class AdminMatterAssessmentCreateView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, matter_id):
        serializer = GenerateCaseAssessmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            case = CaseAssessmentService.authorized_cases(request.user, scope="firm").get(id=matter_id)
            requested = {str(value) for value in serializer.validated_data["document_ids"]}
            allowed = {str(value) for value in case.attachments.filter(id__in=requested).values_list("id", flat=True)}
            if requested != allowed:
                return Response({"detail": "One or more selected documents are not authorized for this matter."}, status=403)
            assessment = CaseAssessmentService.generate(request.user, matter_id, list(requested), scope="firm")
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=403)
        except ObjectDoesNotExist:
            return Response({"detail": "Matter not found."}, status=404)
        return Response({"assessment": _assessment_payload(assessment)}, status=201)
