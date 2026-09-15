from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clients.serializers.admin.client_matter_conflict_check_serializer import ClientMatterConflictCheckDetailSerializer
from apps.clients.serializers.proposed_matter_entry_serializer import ProposedMatterEntrySerializer
from apps.clients.services.proposed_matter_entry_service import ProposedMatterEntryService


class ProposedMatterEntryView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ProposedMatterEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        client, check = ProposedMatterEntryService.create(user=request.user, data=serializer.validated_data)
        return Response({"client_id": str(client.id), "conflict_check": ClientMatterConflictCheckDetailSerializer(check).data}, status=201)
