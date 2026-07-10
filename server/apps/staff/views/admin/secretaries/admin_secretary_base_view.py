from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.staff.views.admin.admin_firm_resolver import get_admin_law_firm


class AdminSecretaryBaseView(APIView):
    permission_classes = [IsAuthenticated]

    def get_law_firm(self):
        return get_admin_law_firm(
            self.request.user,
            message="Only admins can manage secretaries.",
        )
