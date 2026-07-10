from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.lawyer.lawyer_change_password_serializer import (
    LawyerChangePasswordSerializer,
)
from apps.staff.services.lawyer.lawyer_password_service import LawyerPasswordService
from apps.staff.views.lawyer.lawyer_base_view import LawyerBaseView


class LawyerChangePasswordView(LawyerBaseView):
    def post(self, request):
        serializer = LawyerChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            LawyerPasswordService.change_password(
                request.user,
                serializer.validated_data["current_password"],
                serializer.validated_data["new_password"],
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"detail": "Password updated successfully."}, status=status.HTTP_200_OK)
