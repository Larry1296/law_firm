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
UNAVAILABLE_ANSWER = (
    "The answer service is temporarily unavailable. The verified sources below may be "
    "helpful, or you can contact the firm to speak with an advocate."
)


def _verified_extract_answer(retrieved):
    """Useful no-provider fallback without synthesizing claims beyond approved text."""
    excerpts = []
    for index, item in enumerate(retrieved[:2], start=1):
        passage = " ".join(item.passage.split())[:700].strip()
        if passage:
            excerpts.append(f"{passage} [Source {index}]")
    if not excerpts:
        return UNAVAILABLE_ANSWER
    return (
        "The configured answer service is unavailable, but I found this approved "
        "information:\n\n" + "\n\n".join(excerpts) +
        "\n\nPlease speak to an advocate for advice about your circumstances."
    )


def _fingerprint(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
    address = forwarded or request.META.get("REMOTE_ADDR", "unknown")
    return hashlib.sha256(f"{settings.SECRET_KEY}:{address}".encode()).hexdigest()


def _source(item):
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
    return {
        "title": article.title,
        "source_name": article.source_name,
        "source_url": article.source_url,
        "source_reference": article.source_reference,
        "last_verified_at": article.last_verified_at.isoformat() if article.last_verified_at else None,
    }


class KnowledgeBaseCategoryListView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def get(self, request):
        section = request.query_params.get("section", "home")
        allowed = {"home", "about", "practice_areas", "consultation", "contact"}
        if section not in allowed:
            section = "home"
        categories = KnowledgeBaseCategory.objects.filter(
            is_active=True,
            articles__is_published=True,
        ).distinct()
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
        retrieved = KnowledgeRetrievalService.retrieve(question, section=section)
        score = max((item.score for item in retrieved), default=0)
        log = KnowledgeBaseQuestionLog.objects.create(
            question=question,
            retrieval_score=score,
            status=KnowledgeBaseQuestionLog.Status.NO_SOURCE,
            request_fingerprint=_fingerprint(request),
            user_agent_family=request.META.get("HTTP_USER_AGENT", "")[:80],
        )
        if retrieved:
            log.retrieved_articles.set(item.article for item in retrieved if hasattr(item, "article"))

        needs_lawyer = False
        if not retrieved:
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
                answer = UNAVAILABLE_ANSWER
                needs_lawyer = True
                log.status = KnowledgeBaseQuestionLog.Status.ERROR
                logger.exception("Knowledge-base provider request failed", extra={"request_id": str(log.id)})
        log.answer = answer
        log.save(update_fields=("answer", "status", "model", "updated_at"))
        return Response({
            "answer": answer,
            "sources": [_source(item) for item in retrieved],
            "needs_lawyer": needs_lawyer,
            "disclaimer": DISCLAIMER,
            "request_id": str(log.id),
        })
