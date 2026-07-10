from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.secretary import SecretaryChangePasswordSerializer
from apps.staff.services.secretary import SecretaryPasswordService
from apps.staff.views.secretary.secretary_base_view import SecretaryBaseView


class SecretaryChangePasswordView(SecretaryBaseView):
    def post(self, request):
        serializer = SecretaryChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            SecretaryPasswordService.change_password(
                request.user,
                old_password=serializer.validated_data["old_password"],
                new_password=serializer.validated_data["new_password"],
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {"detail": "Password changed successfully."},
            status=status.HTTP_200_OK,
        )
