from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status

from ..services.auth_service import AuthService


class LoginView(APIView):

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        result, error = AuthService.login_user(
            email=email,
            password=password,
        )

        if error:
            return Response(
                {
                    "success": False,
                    "message": error,
                    "detail": error,
                    "errors": {},
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        return Response({
            "access": result["access"],
            "refresh": result["refresh"],
            "user": result["user"],
            "firm": result["firm"],
            "firm_role": result["firm_role"],
        }, status=status.HTTP_200_OK)
