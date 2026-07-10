from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView


class LawyerBaseView(APIView):
    permission_classes = [IsAuthenticated]

    def get_lawyer(self):
        user = self.request.user
        if not hasattr(user, "lawyer_profile"):
            raise PermissionError("Only lawyers can access this endpoint.")
        return user.lawyer_profile
