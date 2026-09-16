from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clients.onboarding_metadata import onboarding_metadata
from apps.clients.serializers.client_detail_serializer import ClientDetailSerializer
from apps.clients.serializers.onboarding_serializers import ClientOnboardingCreateSerializer
from apps.clients.services.onboarding_service import ClientOnboardingService


def onboarding_firm(user):
    from apps.clients.services.prospective_client_service import prospective_firm
    return prospective_firm(user)


class ClientOnboardingMetadataView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.clients.models import IntakePrivacyConfig
        config = IntakePrivacyConfig.active_for(onboarding_firm(request.user))
        data = onboarding_metadata()
        data['intake_privacy'] = {'policy_version': config.policy_version, 'lawful_basis': config.lawful_basis,
                                  'lawful_basis_label': config.get_lawful_basis_display()} if config else None
        return Response(data)


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
