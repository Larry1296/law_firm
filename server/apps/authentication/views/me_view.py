from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.services.auth_service import AuthService


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(AuthService.build_session_payload(request.user))
