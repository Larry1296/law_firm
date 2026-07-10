from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from ..serializers.register_firm_serializer import RegisterFirmSerializer
from ..services.auth_service import AuthService


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