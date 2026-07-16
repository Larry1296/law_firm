from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status

from ..serializers.register_firm_serializer import RegisterFirmSerializer
from ..serializers.register_serializer import RegisterClientSerializer
from ..services.auth_service import AuthService


class RegisterClientView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterClientSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result, error = AuthService.register_client(serializer.validated_data)
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
    Internal onboarding endpoint.
    NOT public registration.
    Creates:
        - Law Firm
        - Admin User
        - Profile
        - Firm Membership
        - JWT tokens
    """

    def post(self, request):
        serializer = RegisterFirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = AuthService.register_firm(serializer.validated_data)

        user = result["user"]
        firm = result["firm"]
        tokens = result["tokens"]

        return Response({
            "access": tokens["access"],
            "refresh": tokens["refresh"],

            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": f"{user.first_name} {user.last_name}",
                "role": user.role,
            },

            "firm": {
                "id": firm.id,
                "name": firm.name,
            }
        }, status=status.HTTP_201_CREATED)
