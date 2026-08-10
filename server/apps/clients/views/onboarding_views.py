from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clients.onboarding_metadata import onboarding_metadata
from apps.clients.serializers.client_detail_serializer import ClientDetailSerializer
from apps.clients.serializers.onboarding_serializers import ClientOnboardingCreateSerializer
from apps.clients.services.onboarding_service import ClientOnboardingService
from apps.common.choices import UserRole
from apps.staff.services.secretary import SecretaryClientService


def onboarding_firm(user):
    if user.role == UserRole.ADMIN and hasattr(user, "owned_firm"):
        return user.owned_firm
    if user.role == UserRole.SECRETARY:
        return SecretaryClientService.ensure_can_manage_clients(user).law_firm
    raise PermissionDenied("You are not authorized to onboard clients.")


class ClientOnboardingMetadataView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        onboarding_firm(request.user)
        return Response(onboarding_metadata())


class ClientOnboardingCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        firm = onboarding_firm(request.user)
        serializer = ClientOnboardingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = ClientOnboardingService.create(firm=firm, created_by=request.user, validated_data=serializer.validated_data)
        return Response({
            "client": ClientDetailSerializer(result["client"]).data,
            "possible_duplicates": result["possible_duplicates"],
            "next_action": "RECORD_PROPOSED_MATTER",
            "temp_password": result.get("temp_password"),
        }, status=status.HTTP_201_CREATED)
