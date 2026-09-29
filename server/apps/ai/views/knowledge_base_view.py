import hashlib
import logging
from django.conf import settings
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai.models import KnowledgeBaseCategory, KnowledgeBaseQuestionLog
from apps.ai.serializers import KnowledgeBaseAskSerializer
from apps.ai.services.knowledge_llm_service import (
    PLATFORM_INSTRUCTION,
    KnowledgeProviderUnavailable,
    KnowledgeAnswerProvider,
)
from apps.ai.services.knowledge_retrieval_service import KnowledgeRetrievalService
from apps.ai.services.public_firm_resolver import PublicFirmResolver
from apps.ai.services.court_process_guide_service import CourtProcessGuideService
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
            "source_reference": provision.citation,
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
        guide = None if intent == "sensitive" else CourtProcessGuideService.answer(question, history, firm)
        if guide is not None:
            answer, step_number = guide
            log = KnowledgeBaseQuestionLog.objects.create(
                firm=firm, question=question, retrieval_score=1.0, status=KnowledgeBaseQuestionLog.Status.ANSWERED,
                request_fingerprint=_fingerprint(request), user_agent_family=request.META.get("HTTP_USER_AGENT", "")[:80],
                answer=answer,
            )
            return Response({
                "answer": answer, "sources": [], "needs_lawyer": False, "disclaimer": "",
                "intent": "court_process", "step": step_number, "can_escalate": True,
                "firm_public_name": firm.name, "request_id": str(log.id),
            })
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
                provider = KnowledgeAnswerProvider()
                answer, needs_lawyer = provider.generate(question, history, retrieved)
                log.status = KnowledgeBaseQuestionLog.Status.ANSWERED
                log.model = provider.model or ""
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


PLATFORM_SCOPE_ANSWER = (
    "I can only answer questions about the law of Kenya. For questions about a particular law firm, "
    "please contact that firm directly."
)
PLATFORM_NO_SOURCE_ANSWER = (
    "I can only answer questions about the law of Kenya, and I do not have enough verified Kenyan legal "
    "material to answer that reliably. Please rephrase your question or speak to an advocate."
)
PLATFORM_SIGN_IN_ANSWER = (
    "To sign in, choose **Login** at the top of this page and use the email address your firm registered "
    "for you. You will be taken to your own firm's dashboard. I can also answer questions about the law of Kenya."
)
# Questions about putting a firm on Sheria Master itself, not about the law.
PLATFORM_REGISTER_FIRM_PHRASES = (
    "register my firm", "register our firm", "register a firm", "register the firm", "register your firm",
    "register my law firm", "register our law firm", "register a law firm",
    "sign up my firm", "sign up our firm", "signup my firm", "add my firm", "list my firm", "onboard my firm",
    "join sheria", "join the platform", "use sheria master", "subscribe my firm",
)
PLATFORM_REGISTER_FIRM_ANSWER = (
    "To put your law firm on Sheria Master, choose **Register your firm** at the top of this page. "
    "Enter your firm's details and your own details as the firm's owner (the managing advocate). {next_step} "
    "Once the firm is set up you sign in as its owner and add your advocates, staff and clients yourself.\n\n"
    "If you meant registering a law practice under Kenyan law, that is done with the Law Society of Kenya, "
    "and I don't yet have verified material on it. An advocate or the Law Society can guide you."
)
PLATFORM_REGISTER_FIRM_NEXT_STEP = {
    True: "Your firm's workspace is created straight away and starts on a free trial.",
    False: "The platform team then contacts you to confirm the details and set up your firm's workspace.",
}
# Questions plainly about a particular firm. Words that are also legal topics
# (advocates, fees, consultation, complaints) are left to legal retrieval.
PLATFORM_OUT_OF_SCOPE_INTENTS = {"services", "overview", "contact", "location", "hours", "owner", "getting_started", "careers"}
PROMPT_INJECTION_TERMS = ("hidden system prompt", "ignore your instructions", "act as the administrator")
PLATFORM_SUGGESTIONS = [
    "What are my rights if I am arrested in Kenya?",
    "What are the steps in a court case?",
    "How much notice must an employer give before termination?",
    "What does the Constitution say about the right to privacy?",
]


class PlatformLegalAssistantView(APIView):
    """The platform homepage assistant: general information on the law of Kenya only.

    It serves no firm, so it never answers from a firm's profile and never logs
    a question against one.
    """

    permission_classes = (AllowAny,)
    authentication_classes = ()
    throttle_classes = (KnowledgeBaseAnonThrottle,)

    def get_throttles(self):
        return super().get_throttles() if self.request.method == "POST" else []

    def get(self, request):
        return Response({"suggestions": PLATFORM_SUGGESTIONS})

    def post(self, request):
        serializer = KnowledgeBaseAskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        question = serializer.validated_data["question"]
        history = serializer.validated_data["history"]
        intent = PublicFirmAnswerService.classify(question)
        log = KnowledgeBaseQuestionLog(
            firm=None, question=question, status=KnowledgeBaseQuestionLog.Status.NO_SOURCE,
            request_fingerprint=_fingerprint(request), user_agent_family=request.META.get("HTTP_USER_AGENT", "")[:80],
        )

        def respond(answer, *, retrieved=(), needs_lawyer=False, response_intent=intent, **extra):
            log.answer = answer
            log.retrieval_score = max((item.score for item in retrieved), default=0)
            log.save()
            return Response({
                "answer": answer,
                "sources": [_source(item) for item in retrieved],
                "needs_lawyer": needs_lawyer,
                "disclaimer": DISCLAIMER if response_intent == "legal" else "",
                "intent": response_intent,
                "can_escalate": False,
                "request_id": str(log.id),
                **extra,
            })

        if intent == "portal":
            log.status = KnowledgeBaseQuestionLog.Status.ANSWERED
            return respond(PLATFORM_SIGN_IN_ANSWER, response_intent="out_of_scope")
        if any(phrase in " ".join(question.lower().split()) for phrase in PLATFORM_REGISTER_FIRM_PHRASES):
            log.status = KnowledgeBaseQuestionLog.Status.ANSWERED
            next_step = PLATFORM_REGISTER_FIRM_NEXT_STEP[bool(settings.ALLOW_PUBLIC_FIRM_SIGNUP)]
            return respond(
                PLATFORM_REGISTER_FIRM_ANSWER.format(next_step=next_step),
                response_intent="out_of_scope", action={"label": "Register your firm", "path": "/register-firm"},
            )
        if intent in PLATFORM_OUT_OF_SCOPE_INTENTS or any(term in question.lower() for term in PROMPT_INJECTION_TERMS):
            log.status = KnowledgeBaseQuestionLog.Status.ANSWERED
            return respond(PLATFORM_SCOPE_ANSWER, response_intent="out_of_scope")

        guide = CourtProcessGuideService.answer(question, history, None)
        if guide is not None:
            answer, step_number = guide
            log.status = KnowledgeBaseQuestionLog.Status.ANSWERED
            return respond(answer, response_intent="court_process", step=step_number)

        retrieved = KnowledgeRetrievalService.retrieve_law(question)
        if not retrieved:
            return respond(PLATFORM_NO_SOURCE_ANSWER, response_intent="out_of_scope")
        try:
            provider = KnowledgeAnswerProvider()
            answer, needs_lawyer = provider.generate(question, history, retrieved, instructions=PLATFORM_INSTRUCTION)
            log.status = KnowledgeBaseQuestionLog.Status.ANSWERED
            log.model = provider.model or ""
        except KnowledgeProviderUnavailable:
            answer, needs_lawyer = _verified_extract_answer(retrieved), True
            log.status = KnowledgeBaseQuestionLog.Status.PROVIDER_UNAVAILABLE
            logger.warning("Platform legal assistant provider unavailable")
        except Exception:
            answer, needs_lawyer = _verified_extract_answer(retrieved), True
            log.status = KnowledgeBaseQuestionLog.Status.ERROR
            logger.exception("Platform legal assistant provider request failed")
        return respond(answer, retrieved=retrieved, needs_lawyer=needs_lawyer)
