import logging

from django.http import Http404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai.assistants import ASSISTANTS
from apps.ai.assistants.base import Unavailable
from apps.ai.serializers import KnowledgeBaseAskSerializer
from apps.ai.throttles import DashboardAssistantThrottle

logger = logging.getLogger(__name__)


class DashboardAssistantView(APIView):
    """GET: whether this user may use the assistant, with its copy and suggestions. POST: ask it."""

    permission_classes = (IsAuthenticated,)
    throttle_classes = (DashboardAssistantThrottle,)

    def get_throttles(self):
        return super().get_throttles() if self.request.method == "POST" else []

    @staticmethod
    def assistant(kind):
        assistant_class = ASSISTANTS.get(kind)
        if assistant_class is None:
            raise Http404
        return assistant_class()

    def get(self, request, kind):
        return Response(self.assistant(kind).describe(request.user))

    def post(self, request, kind):
        assistant = self.assistant(kind)
        serializer = KnowledgeBaseAskSerializer(data={**request.data, "page_context": {}})
        serializer.is_valid(raise_exception=True)
        try:
            result = assistant.answer(
                request.user, serializer.validated_data["question"], serializer.validated_data["history"],
            )
        except Unavailable as exc:
            return Response({"detail": str(exc)}, status=403)
        return Response(result)
