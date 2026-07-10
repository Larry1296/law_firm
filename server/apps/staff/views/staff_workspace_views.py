from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.staff.serializers.staff_workspace_serializers import (
    StaffWorkspaceChangePasswordSerializer,
    StaffWorkspaceDashboardSerializer,
    StaffWorkspaceItemSerializer,
    StaffWorkspaceProfileSerializer,
)
from apps.staff.services.staff_workspace_service import StaffWorkspaceService


class StaffWorkspaceBaseView(APIView):
    permission_classes = [IsAuthenticated]
    profile_attr = None
    role_label = "Staff"

    def get_profile(self):
        return StaffWorkspaceService.get_profile(
            self.request.user,
            self.profile_attr,
            self.role_label,
        )


class StaffWorkspaceProfileView(StaffWorkspaceBaseView):
    def get(self, request):
        try:
            profile = self.get_profile()
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        return Response(
            {"profile": StaffWorkspaceProfileSerializer(profile).data},
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        try:
            profile = StaffWorkspaceService.update_profile(
                request.user,
                self.profile_attr,
                self.role_label,
                request.data,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        return Response(
            {"profile": StaffWorkspaceProfileSerializer(profile).data},
            status=status.HTTP_200_OK,
        )


class StaffWorkspaceDashboardView(StaffWorkspaceBaseView):
    default_work = staticmethod(lambda profile: {})

    def get(self, request):
        try:
            data = StaffWorkspaceService.dashboard(
                request.user,
                self.profile_attr,
                self.role_label,
                self.default_work,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        return Response(
            StaffWorkspaceDashboardSerializer(data).data,
            status=status.HTTP_200_OK,
        )


class StaffWorkspaceChangePasswordView(StaffWorkspaceBaseView):
    def post(self, request):
        serializer = StaffWorkspaceChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            StaffWorkspaceService.change_password(
                request.user,
                self.profile_attr,
                self.role_label,
                old_password=serializer.validated_data["old_password"],
                new_password=serializer.validated_data["new_password"],
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {"detail": "Password changed successfully."},
            status=status.HTTP_200_OK,
        )


class StaffWorkspaceItemsView(StaffWorkspaceBaseView):
    item_type = "item"
    response_key = "items"

    def get(self, request):
        try:
            items = StaffWorkspaceService.placeholder_items(
                request.user,
                self.profile_attr,
                self.role_label,
                self.item_type,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        serializer = StaffWorkspaceItemSerializer(items, many=True)
        return Response({self.response_key: serializer.data}, status=status.HTTP_200_OK)
