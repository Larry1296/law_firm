from rest_framework import status
from rest_framework.response import Response

from apps.clients.serializers.client.client_case_serializer import ClientCaseSerializer
from apps.clients.services.client.client_case_service import ClientCaseService
from apps.clients.views.client.client_base_view import ClientBaseView


class ClientCasesView(ClientBaseView):
    def get(self, request, case_id=None):
        try:
            client = request.user.client_profile
        except Exception:
            return Response({"detail": "Only clients can access this endpoint."}, status=status.HTTP_403_FORBIDDEN)

        if case_id is not None:
            case = ClientCaseService.get_case(client, case_id)
            if case is None:
                return Response(
                    {"detail": "Case not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            serializer = ClientCaseSerializer(case)
            return Response({"case": serializer.data}, status=status.HTTP_200_OK)

        serializer = ClientCaseSerializer(ClientCaseService.list_cases(client), many=True)
        return Response({"cases": serializer.data}, status=status.HTTP_200_OK)
