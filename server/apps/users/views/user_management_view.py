from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.serializers import UserSerializer
from apps.users.services.user_service import UserService


class UserDetailView(APIView):

    def get(self, request, user_id):

        user = UserService.get_user_profile(user_id)

        serializer = UserSerializer(user)

        return Response(serializer.data)