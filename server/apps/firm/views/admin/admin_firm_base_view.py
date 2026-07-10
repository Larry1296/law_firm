from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.common.choices import UserRole


class AdminFirmBaseView(APIView):
    permission_classes = [IsAuthenticated]

    def get_firm(self):
        user = self.request.user

        if user.role != UserRole.ADMIN:
            raise PermissionDenied("Only admins can manage firm settings.")

        if hasattr(user, "owned_firm"):
            return user.owned_firm

        membership = (
            user.firm_memberships
            .filter(is_active=True)
            .select_related("firm")
            .first()
        )

        if membership:
            return membership.firm

        raise PermissionDenied("Admin is not attached to a law firm.")
