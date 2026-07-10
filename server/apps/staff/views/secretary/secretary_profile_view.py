from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.secretary import SecretaryProfileSerializer
from apps.staff.services.secretary import SecretaryProfileService
from apps.staff.views.secretary.secretary_base_view import SecretaryBaseView


class SecretaryProfileView(SecretaryBaseView):
    def get(self, request):
        try:
            secretary = SecretaryProfileService.get_secretary_profile(request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        return Response(
            {"secretary": SecretaryProfileSerializer(secretary).data},
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        try:
            secretary = SecretaryProfileService.update_secretary_profile(
                request.user,
                request.data,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        return Response(
            {"secretary": SecretaryProfileSerializer(secretary).data},
            status=status.HTTP_200_OK,
        )
