from django.core.exceptions import ObjectDoesNotExist
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai.models import AIFindingFeedback
from apps.ai.serializers import AIFindingFeedbackSerializer, GenerateCaseAssessmentSerializer
from apps.ai.services.case_assessment_service import CaseAssessmentService, DISCLAIMER
from apps.staff.models import LawyerPermission


def _require_lawyer(user):
    lawyer = getattr(user, "lawyer_profile", None)
    if lawyer is None or not lawyer.is_active:
        raise PermissionError("Only active lawyers may use case analysis.")
    if not lawyer.has_permission(LawyerPermission.USE_AI_TOOLS):
        raise PermissionError("The USE_AI_TOOLS permission is required.")
    return lawyer


def _assessment_payload(assessment, *, history=False):
    case = assessment.case
    source_state = CaseAssessmentService._state_at(case)
    stale = assessment.is_stale or assessment.source_state_at < source_state
    document_analyses = [{"document_id": str(item.document_id), "title": item.document.title, "extraction_status": item.extraction_status, "detected_type": item.detected_type, "page_count": item.page_count, "extraction_quality": item.extraction_quality, "facts": item.extracted_facts, "inconsistencies": item.inconsistencies, "evidence_gaps": item.evidence_gaps, "page_citations": item.page_citations, "authenticity_verified": item.authenticity_verified} for item in assessment.document_analyses.select_related("document").all()]
    return {
        "id": str(assessment.id), "version": assessment.version,
        "matter": assessment.case_snapshot, "priority": assessment.priority,
        "component_scores": assessment.component_scores,
        "component_reasons": assessment.component_reasons,
        "alerts": assessment.alerts, "gaps": assessment.gaps,
        "recommendations": assessment.recommendations,
        "preparedness": assessment.preparedness,
        "progression": assessment.proceeding_snapshot,
        "documents": assessment.document_snapshot,
        "document_analyses": document_analyses,
        "legal_analysis": assessment.legal_analysis,
        "outcome_scenarios": assessment.outcome_scenarios,
        "comparable_matters": assessment.comparable_matters,
        "confidence": assessment.confidence, "limitations": assessment.limitations,
        "model": assessment.model, "model_version": assessment.model_version,
        "prompt_version": assessment.prompt_version,
        "retrieval_version": assessment.retrieval_version,
        "scoring_version": assessment.scoring_version,
        "priority_version": assessment.priority_version,
        "knowledge_index_version": assessment.knowledge_index_version,
        "change_summary": assessment.change_summary,
        "analyzed_at": assessment.analyzed_at.isoformat(),
        "is_stale": stale, "requires_reassessment": stale,
        "disclaimer": DISCLAIMER,
    }


class LawyerCasePriorityListView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        try:
            _require_lawyer(request.user)
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=403)
        return Response({
            "matters": CaseAssessmentService.list_priorities(request.user, request.query_params),
            "methodology": {
                "version": "priority-v1",
                "components": ["Time urgency", "Consequence severity", "Procedural risk", "Evidence readiness", "Legal preparedness"],
                "default_order": "Critical and time-sensitive matters first",
                "note": "Urgency and preparedness are separate from likely judicial outcome.",
            },
            "disclaimer": DISCLAIMER,
        })


class LawyerCaseAssessmentView(APIView):
    permission_classes = (IsAuthenticated,)

    def _case(self, request, case_id):
        _require_lawyer(request.user)
        return CaseAssessmentService.authorized_cases(request.user).get(id=case_id)

    def get(self, request, case_id):
        try:
            case = self._case(request, case_id)
        except (ObjectDoesNotExist, ValueError):
            return Response({"detail": "Matter not found."}, status=404)
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=403)
        current = case.ai_assessments.order_by("-version").first()
        history = [_assessment_payload(item, history=True) for item in case.ai_assessments.order_by("-version")[:20]]
        return Response({
            "matter": CaseAssessmentService.summary(case),
            "assessment": _assessment_payload(current) if current else None,
            "history": history,
            "available_documents": [{"id": str(item.id), "title": item.title, "type": item.get_attachment_type_display(), "reference": item.document_reference, "confidential": item.is_confidential} for item in case.attachments.all()],
            "disclaimer": DISCLAIMER,
        })

    def post(self, request, case_id):
        serializer = GenerateCaseAssessmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            case = self._case(request, case_id)
            requested = {str(item) for item in serializer.validated_data["document_ids"]}
            allowed = {str(item) for item in case.attachments.filter(id__in=requested).values_list("id", flat=True)}
            if requested != allowed:
                return Response({"detail": "One or more selected documents are not authorized for this matter."}, status=403)
            assessment = CaseAssessmentService.generate(request.user, case_id, list(requested))
        except (ObjectDoesNotExist, ValueError):
            return Response({"detail": "Matter not found."}, status=404)
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=403)
        return Response({"assessment": _assessment_payload(assessment)}, status=201)


class LawyerFindingFeedbackView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, case_id, assessment_id):
        serializer = AIFindingFeedbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            _require_lawyer(request.user)
            case = CaseAssessmentService.authorized_cases(request.user).get(id=case_id)
            assessment = case.ai_assessments.get(id=assessment_id)
        except ObjectDoesNotExist:
            return Response({"detail": "Assessment not found."}, status=404)
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=403)
        feedback = AIFindingFeedback.objects.create(
            assessment=assessment, case=case, submitted_by=request.user,
            model_version=assessment.model_version, prompt_version=assessment.prompt_version,
            retrieval_sources=[str(item.id) for item in assessment.retrieved_provisions.all()],
            **serializer.validated_data,
        )
        if feedback.rating in {AIFindingFeedback.Rating.INCORRECT, AIFindingFeedback.Rating.OUTDATED}:
            assessment.is_stale = True
            assessment.save(update_fields=("is_stale", "updated_at"))
        return Response({"id": str(feedback.id), "review_status": feedback.review_status}, status=201)
