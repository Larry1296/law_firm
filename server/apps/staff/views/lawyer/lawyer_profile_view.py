from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.lawyer.lawyer_profile_serializer import LawyerProfileSerializer
from apps.staff.services.lawyer.lawyer_profile_service import LawyerProfileService
from apps.staff.views.lawyer.lawyer_base_view import LawyerBaseView


class LawyerProfileView(LawyerBaseView):
    def get(self, request):
        try:
            lawyer = LawyerProfileService.get_lawyer_profile(request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        serializer = LawyerProfileSerializer(lawyer)
        return Response({"lawyer": serializer.data}, status=status.HTTP_200_OK)

    def patch(self, request):
        try:
            lawyer = LawyerProfileService.update_lawyer_profile(request.user, request.data)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        serializer = LawyerProfileSerializer(lawyer)
        return Response({"lawyer": serializer.data}, status=status.HTTP_200_OK)
