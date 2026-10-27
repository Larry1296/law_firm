from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.services.auth_service import AuthService


class UnlockPinView(APIView):
    """Set (POST, with the current password) or remove (DELETE) the signed-in user's unlock PIN."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        success, error = AuthService.set_unlock_pin(
            user=request.user,
            current_password=request.data.get("current_password", ""),
            pin=str(request.data.get("pin", "")),
        )
        if not success:
            return Response({"detail": error}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"message": "Unlock PIN saved.", "has_unlock_pin": True})

    def delete(self, request):
        AuthService.remove_unlock_pin(request.user)
        return Response({"message": "Unlock PIN removed.", "has_unlock_pin": False})


class UnlockWithPinView(APIView):
    """Unlock a locked workspace with the PIN and this device's own sign-in."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        result, error, signed_out = AuthService.unlock_with_pin(
            refresh_token=request.data.get("refresh", ""),
            pin=str(request.data.get("pin", "")),
        )
        if error:
            return Response(
                {"detail": error, "signed_out": signed_out},
                status=status.HTTP_401_UNAUTHORIZED if signed_out else status.HTTP_400_BAD_REQUEST,
            )
        return Response(result, status=status.HTTP_200_OK)
