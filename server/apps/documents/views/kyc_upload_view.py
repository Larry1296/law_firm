from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView



class KycDocumentUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, client_id):
        return Response(
            {"detail": "Document uploads are disabled. The firm records physical documents by KYC drawer reference."},
            status=405,
        )
