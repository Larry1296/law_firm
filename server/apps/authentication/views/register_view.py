from django.conf import settings
from rest_framework.exceptions import NotFound
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework import status

from apps.ai.services.public_firm_resolver import PublicFirmResolver

from ..serializers.register_firm_serializer import RegisterFirmSerializer
from ..serializers.register_serializer import RegisterClientSerializer
from ..services.auth_service import AuthService


class RegisterClientView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterClientSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result, error = AuthService.register_client(
            serializer.validated_data,
            firm=PublicFirmResolver.resolve(request),
        )
        if error:
            return Response(
                {"success": False, "message": error, "detail": error, "errors": {}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "access": result["access"],
                "refresh": result["refresh"],
                "user": result["user"],
                "firm": result["firm"],
                "firm_role": result["firm_role"],
                "client": {
                    "id": result["client"].id,
                    "is_verified": result["client"].is_verified,
                    "lifecycle_status": result["client"].lifecycle_status,
                    "access_type": result["client"].access_type,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class RegisterFirmView(APIView):
    """
    Public SaaS sign-up for a law firm.

    Creates the firm, its managing partner (firm administrator and advocate
    with every advocate permission), default settings and a trial subscription,
    then signs the managing partner in.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "firm_signup"

    def post(self, request):
        if not settings.ALLOW_PUBLIC_FIRM_SIGNUP:
            raise NotFound()
        serializer = RegisterFirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            AuthService.register_firm(serializer.validated_data),
            status=status.HTTP_201_CREATED,
        )
