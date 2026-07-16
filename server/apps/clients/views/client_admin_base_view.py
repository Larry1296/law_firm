from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView

from apps.common.choices import UserRole


class ClientAdminBaseView(APIView):
    permission_classes = [IsAuthenticated]

    def get_firm(self):
        user = self.request.user
        if user.role != UserRole.ADMIN:
            raise PermissionDenied("Only admins can manage clients.")

        if hasattr(user, "owned_firm"):
            return user.owned_firm

        raise PermissionDenied("Only the firm owner can manage clients from the admin dashboard.")
