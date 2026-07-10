from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status


class ResetPasswordView(APIView):

    def post(self, request):
        token = request.data.get("token")
        new_password = request.data.get("new_password")

        # TODO:
        # - validate token
        # - find user
        # - reset password

        return Response(
            {"detail": "Password reset successful"},
            status=status.HTTP_200_OK
        )