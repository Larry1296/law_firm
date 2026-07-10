from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.serializers.change_password_serializer import (
    ChangePasswordSerializer,
)
from apps.authentication.services.auth_service import AuthService


class ChangePasswordView(APIView):
    """
    Allows an authenticated user to change their password.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        success, error = AuthService.change_password(
            user=request.user,
            current_password=serializer.validated_data[
                "current_password"
            ],
            new_password=serializer.validated_data[
                "new_password"
            ],
        )

        if not success:
            return Response(
                {
                    "detail": error,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": (
                    "Password changed successfully."
                )
            },
            status=status.HTTP_200_OK,
        )