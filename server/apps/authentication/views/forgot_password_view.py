from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status


class ForgotPasswordView(APIView):

    def post(self, request):
        email = request.data.get("email")

        # TODO:
        # - generate reset token
        # - send email
        # - store reset record

        return Response(
            {"detail": "Password reset link sent if email exists"},
            status=status.HTTP_200_OK
        )