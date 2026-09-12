from rest_framework import status
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clients.serializers.walk_in_enquiry_serializer import WalkInEnquirySerializer
from apps.clients.services.walk_in_enquiry_service import WalkInEnquiryService


class WalkInEnquiryListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    def get(self, request):
        enquiries = WalkInEnquiryService.list(user=request.user)
        return Response({"enquiries": WalkInEnquirySerializer(enquiries, many=True).data})

    def post(self, request):
        enquiry = WalkInEnquiryService.create(user=request.user, data=request.data)
        return Response(WalkInEnquirySerializer(enquiry).data, status=status.HTTP_201_CREATED)
