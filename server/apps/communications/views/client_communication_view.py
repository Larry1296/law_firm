from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cases.services.case_service import CaseService
from apps.communications.models import ClientCommunication
from apps.communications.serializers.client_communication_serializer import ClientCommunicationSerializer, CommunicationAmendSerializer
from apps.communications.services.client_communication_service import ClientCommunicationService


class ClientCommunicationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, matter_id):
        firm = CaseService.get_user_firm(request.user)
        records = ClientCommunication.objects.filter(firm=firm, matter_id=matter_id).prefetch_related("amendments")
        return Response({"communications": ClientCommunicationSerializer(records, many=True).data})

    def post(self, request, matter_id):
        serializer = ClientCommunicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = ClientCommunicationService.create(user=request.user, matter_id=matter_id, data=serializer.validated_data)
        return Response({"communication": ClientCommunicationSerializer(record).data}, status=status.HTTP_201_CREATED)


class ClientCommunicationAmendView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, communication_id):
        serializer = CommunicationAmendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = ClientCommunicationService.amend(user=request.user, communication_id=communication_id, **serializer.validated_data)
        return Response({"communication": ClientCommunicationSerializer(record).data})
