from rest_framework import status
from rest_framework.response import Response

from apps.clients.serializers.client.client_profile_serializer import ClientProfileSerializer
from apps.clients.services.client.client_profile_service import ClientProfileService
from apps.clients.views.client.client_base_view import ClientBaseView


class ClientProfileView(ClientBaseView):
    def get(self, request):
        try:
            client = ClientProfileService.get_client_profile(request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        serializer = ClientProfileSerializer(client)
        return Response({"client": serializer.data}, status=status.HTTP_200_OK)
