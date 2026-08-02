"""
Public knowledge-base endpoint.

No authentication required — this is accessible to all visitors of the
homepage.

POST /api/knowledge-base/ask/
Body: { "question": "...", "history": [...] }
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle

from .serializers import KnowledgeBaseAskSerializer
from .service import ask_knowledge_base
from .prompts import KNOWLEDGE_BASE_SYSTEM_PROMPT


class KnowledgeBaseAskView(APIView):
    """
    Accept a legal question (and optional conversation history) from any
    visitor and return an AI-generated answer grounded in Kenyan law and
    Sheria Master firm information.
    """
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        serializer = KnowledgeBaseAskSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {"errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        question = serializer.validated_data["question"]
        history = serializer.validated_data.get("history", [])

        try:
            answer = ask_knowledge_base(
                question=question,
                history=history,
                system_prompt=KNOWLEDGE_BASE_SYSTEM_PROMPT,
            )
        except RuntimeError as exc:
            return Response(
                {"error": str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "answer": answer,
                "question": question,
            },
            status=status.HTTP_200_OK,
        )
