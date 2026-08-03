import hashlib
import logging
from django.conf import settings
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai.models import KnowledgeBaseCategory, KnowledgeBaseQuestionLog
from apps.ai.serializers import KnowledgeBaseAskSerializer
from apps.ai.services.knowledge_llm_service import (
    KnowledgeProviderUnavailable,
    OpenAIKnowledgeProvider,
)
from apps.ai.services.knowledge_retrieval_service import KnowledgeRetrievalService
from apps.ai.services.public_firm_resolver import PublicFirmResolver
from apps.ai.services.public_firm_answer_service import PublicFirmAnswerService
from apps.ai.services.public_knowledge_service import PublicKnowledgeEligibility
from apps.ai.throttles import KnowledgeBaseAnonThrottle

logger = logging.getLogger(__name__)
DISCLAIMER = (
    "General legal information only—not legal advice. Using this assistant does not "
    "create an advocate-client relationship. Do not submit confidential information."
)
NO_SOURCE_ANSWER = (
    "I do not have enough verified information to answer that reliably. Please speak "
    "to an advocate."
)
def _verified_extract_answer(retrieved):
    """Useful no-provider fallback without synthesizing claims beyond approved text."""
    excerpts = []
    for index, item in enumerate(retrieved[:2], start=1):
        passage = " ".join(item.passage.split())[:700].strip()
        if passage:
            excerpts.append(f"{passage} [Source {index}]")
    if not excerpts:
        return "I do not have approved information relevant to that question. Please speak to an advocate or contact the firm."
    return (
        "Based on the approved information available:\n\n" + "\n\n".join(excerpts)
    )


def _fingerprint(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
    address = forwarded or request.META.get("REMOTE_ADDR", "unknown")
    return hashlib.sha256(f"{settings.SECRET_KEY}:{address}".encode()).hexdigest()


def _source(item, intent="legal"):
    if hasattr(item, "provision"):
        provision = item.provision
        return {
            "title": provision.document.title,
            "source_name": "Kenya Law",
            "source_url": provision.document.official_url,
            "source_reference": f"Article {provision.article_number} — {provision.heading}" if provision.article_number else provision.heading,
            "last_verified_at": provision.document.last_verified_at.isoformat() if provision.document.last_verified_at else None,
        }
    article = item.article
    titles = {
        "services": f"{article.firm.name} practice areas",
        "contact": f"{article.firm.name} contact information",
        "location": f"{article.firm.name} office location",
        "hours": f"{article.firm.name} working hours",
        "owner": f"{article.firm.name} public firm profile",
        "overview": f"{article.firm.name} public firm profile",
    }
    source_url = article.source_url if article.source_url.startswith("https://") else ""
    return {
        "title": titles.get(intent, article.title),
        "source_name": article.firm.name,
        "source_url": source_url,
        "source_reference": "",
        "last_verified_at": article.last_verified_at.isoformat() if article.last_verified_at else None,
    }


class KnowledgeBaseCategoryListView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def get(self, request):
        firm = PublicFirmResolver.resolve(request)
        if firm is None:
            return Response({"detail": "Public website firm could not be resolved safely."}, status=404)
        section = request.query_params.get("section", "home")
        allowed = {"home", "about", "practice_areas", "consultation", "contact"}
        if section not in allowed:
            section = "home"
        eligible_ids = PublicKnowledgeEligibility.queryset(firm=firm).values("category_id")
        categories = KnowledgeBaseCategory.objects.filter(is_active=True, id__in=eligible_ids).distinct()
        category_data = [
            {
                "name": category.name,
                "slug": category.slug,
                "description": category.description,
                "suggested_question": category.suggested_question,
            }
            for category in categories
            if not category.page_sections or section in category.page_sections
        ]
        return Response({
            "section": section,
            "categories": category_data,
            "suggestions": [item["suggested_question"] for item in category_data if item["suggested_question"]][:4],
        })


class KnowledgeBaseAskView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = ()
    throttle_classes = (KnowledgeBaseAnonThrottle,)

    def post(self, request):
        serializer = KnowledgeBaseAskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        question = serializer.validated_data["question"]
        history = serializer.validated_data["history"]
        section = serializer.validated_data["page_context"]["section"]
        firm = PublicFirmResolver.resolve(request)
        if firm is None:
            return Response({"detail": "Public website firm could not be resolved safely."}, status=404)
        intent = PublicFirmAnswerService.classify(question)
        if intent == "sensitive":
            retrieved = []
        elif intent in PublicFirmAnswerService.FIRM_INTENTS:
            retrieved = KnowledgeRetrievalService.firm_profile(firm)
            categories = PublicFirmAnswerService.categories_for(intent)
            relevant = [item for item in retrieved if item.article.public_category in categories]
            legacy = [item for item in retrieved if item.article.source_type == item.article.SourceType.FIRM_PROFILE]
            retrieved = relevant or legacy
        else:
            retrieved = KnowledgeRetrievalService.retrieve(question, section=section, firm=firm)
        score = max((item.score for item in retrieved), default=0)
        log = KnowledgeBaseQuestionLog.objects.create(
            firm=firm,
            question=question,
            retrieval_score=score,
            status=KnowledgeBaseQuestionLog.Status.NO_SOURCE,
            request_fingerprint=_fingerprint(request),
            user_agent_family=request.META.get("HTTP_USER_AGENT", "")[:80],
        )
        if retrieved:
            log.retrieved_articles.set(item.article for item in retrieved if hasattr(item, "article"))

        needs_lawyer = False
        if intent == "sensitive":
            answer = PublicFirmAnswerService.compose(firm.name, intent, [])
            needs_lawyer = False
            log.status = KnowledgeBaseQuestionLog.Status.ANSWERED
        elif intent in PublicFirmAnswerService.FIRM_INTENTS:
            answer = PublicFirmAnswerService.compose(firm.name, intent, [item.article for item in retrieved])
            log.status = KnowledgeBaseQuestionLog.Status.ANSWERED
        elif not retrieved:
            answer = NO_SOURCE_ANSWER
            needs_lawyer = True
        else:
            try:
                answer, needs_lawyer = OpenAIKnowledgeProvider().generate(
                    question, history, retrieved
                )
                log.status = KnowledgeBaseQuestionLog.Status.ANSWERED
                log.model = settings.OPENAI_MODEL
            except KnowledgeProviderUnavailable:
                answer = _verified_extract_answer(retrieved)
                needs_lawyer = True
                log.status = KnowledgeBaseQuestionLog.Status.PROVIDER_UNAVAILABLE
                logger.warning("Knowledge-base answer provider unavailable", extra={"request_id": str(log.id)})
            except Exception:
                answer = _verified_extract_answer(retrieved)
                needs_lawyer = True
                log.status = KnowledgeBaseQuestionLog.Status.ERROR
                logger.exception("Knowledge-base provider request failed", extra={"request_id": str(log.id)})
        log.answer = answer
        log.save(update_fields=("answer", "status", "model", "updated_at"))
        return Response({
            "answer": answer,
            "sources": [_source(item, intent) for item in retrieved],
            "needs_lawyer": needs_lawyer,
            "disclaimer": DISCLAIMER if intent == "legal" else "",
            "intent": intent,
            "can_escalate": True,
            "firm_public_name": firm.name,
            "request_id": str(log.id),
        })
