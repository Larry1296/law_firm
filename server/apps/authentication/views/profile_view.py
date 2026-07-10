from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        membership = getattr(user, "firmmembership_set", None)
        membership = membership.filter(is_active=True).select_related("firm").first() if membership else None

        return Response({
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": f"{user.first_name} {user.last_name}",
                "role": user.role,
            },

            "firm": {
                "id": membership.firm.id if membership else None,
                "name": membership.firm.name if membership else None,
            },

            "firm_role": membership.firm_role if membership else None,
        })