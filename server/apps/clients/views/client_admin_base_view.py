from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.common.choices import UserRole


class ClientAdminBaseView(APIView):
    permission_classes = [IsAuthenticated]

    def get_firm(self):
        user = self.request.user
        if user.role != UserRole.ADMIN:
            raise PermissionError("Only admins can manage clients.")

        if hasattr(user, "owned_firm"):
            return user.owned_firm

        membership = (
            user.firm_memberships.filter(is_active=True)
            .select_related("firm")
            .first()
            if hasattr(user, "firm_memberships")
            else None
        )
        if membership:
            return membership.firm

        if hasattr(user, "lawyer_profile"):
            return user.lawyer_profile.law_firm

        raise PermissionError("Admin is not attached to a law firm.")
