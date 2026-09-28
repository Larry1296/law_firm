from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.authentication.serializers.recover_account_serializer import RecoverAccountSerializer
from apps.authentication.services.auth_service import AuthService

RECOVERY_MESSAGE = (
    "If an account matches these details, we have emailed a password reset link to the email address "
    "registered to it. If you can no longer use that email address, ask your firm's administrator to "
    "update it for you."
)


class RecoverAccountView(APIView):
    """Recover an account from a National ID or phone number instead of an email address.

    The reply is the same whether or not an account matches, so the endpoint
    never reveals who has an account (for example, who is a client of a firm).
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "account_recovery"

    def post(self, request):
        serializer = RecoverAccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reset_payload = AuthService.request_account_recovery(**serializer.validated_data)

        response = {"detail": RECOVERY_MESSAGE}
        if settings.DEBUG and reset_payload:
            response["debug"] = reset_payload
        return Response(response, status=status.HTTP_200_OK)
