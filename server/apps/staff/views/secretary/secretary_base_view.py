from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView


class SecretaryBaseView(APIView):
    permission_classes = [IsAuthenticated]

    def get_secretary(self):
        user = self.request.user
        if not hasattr(user, "secretary_profile"):
            raise PermissionError("Only secretaries can access this endpoint.")
        return user.secretary_profile
