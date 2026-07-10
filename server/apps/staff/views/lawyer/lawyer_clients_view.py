from rest_framework import status
from rest_framework.response import Response

from apps.staff.serializers.lawyer.lawyer_client_serializer import LawyerClientSerializer
from apps.staff.services.lawyer.lawyer_client_service import LawyerClientService
from apps.staff.views.lawyer.lawyer_base_view import LawyerBaseView


class LawyerClientsView(LawyerBaseView):
    def get(self, request):
        try:
            clients = LawyerClientService.list_clients(request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        serializer = LawyerClientSerializer(clients, many=True)
        return Response({"clients": serializer.data}, status=status.HTTP_200_OK)
