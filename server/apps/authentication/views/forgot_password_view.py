from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.serializers.forgot_password_serializer import ForgotPasswordSerializer
from apps.authentication.services.auth_service import AuthService


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reset_payload = AuthService.request_password_reset(
            serializer.validated_data["email"],
        )

        response = {"detail": "Password reset link sent if email exists"}
        if settings.DEBUG and reset_payload:
            response["debug"] = reset_payload

        return Response(
            response,
            status=status.HTTP_200_OK,
        )
