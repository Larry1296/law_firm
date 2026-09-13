import logging

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.db import IntegrityError
from django.http import Http404
from rest_framework.exceptions import APIException
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clients.models import WalkInPrivacyConfig
from apps.clients.serializers.walk_in_enquiry_serializer import WalkInEnquirySerializer, WalkInCorrectionSerializer
from apps.clients.services.walk_in_enquiry_service import WalkInEnquiryService
from apps.clients.services.walk_in_privacy_service import privacy_notice, WalkInPrivacyConfigSerializer

logger = logging.getLogger(__name__)


class WalkInBaseView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]
    workspace = 'admin'

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        WalkInEnquiryService.firm_for(request.user, self.workspace)

    def handle_exception(self, exc):
        if isinstance(exc, (APIException, DjangoPermissionDenied, Http404, IntegrityError)):
            return super().handle_exception(exc)
        # Exceptions can include SQL parameters or user input. Never log their text/traceback.
        logger.error('Walk-in intake operation failed; request data and exception details withheld.')
        return Response({'message': 'Unable to complete the intake operation.', 'errors': {}}, status=500)


class WalkInEnquiryListCreateView(WalkInBaseView):
    def get(self, request):
        enquiries = WalkInEnquiryService.list(user=request.user, workspace=self.workspace)
        return Response({'enquiries': WalkInEnquirySerializer(enquiries, many=True).data})

    def post(self, request):
        enquiry = WalkInEnquiryService.create(user=request.user, data=request.data, workspace=self.workspace)
        return Response(WalkInEnquirySerializer(enquiry).data, status=201)


class WalkInPrivacyNoticeView(WalkInBaseView):
    def get(self, request):
        firm = WalkInEnquiryService.firm_for(request.user, self.workspace)
        result = privacy_notice(firm)
        if self.workspace == 'admin':
            config = WalkInPrivacyConfig.objects.filter(firm=firm).first()
            result['configuration'] = WalkInPrivacyConfigSerializer(config).data if config else None
        return Response(result)

    def put(self, request):
        return Response(WalkInEnquiryService.configure_notice(user=request.user, data=request.data, workspace=self.workspace))


class WalkInNoticeDeliveryView(WalkInBaseView):
    def post(self, request):
        receipt = WalkInEnquiryService.deliver_notice(user=request.user, data=request.data, workspace=self.workspace)
        return Response({'id': str(receipt.pk), 'version': receipt.version, 'method': receipt.method,
                         'delivered_at': receipt.delivered_at, 'acknowledged': receipt.acknowledged}, status=201)


class WalkInEnquiryCorrectionView(WalkInBaseView):
    def get(self, request, enquiry_id):
        history = WalkInEnquiryService.history(user=request.user, enquiry_id=enquiry_id, workspace=self.workspace)
        return Response({'corrections': WalkInCorrectionSerializer(history, many=True).data})

    def post(self, request, enquiry_id):
        enquiry = WalkInEnquiryService.correct(user=request.user, enquiry_id=enquiry_id,
                                              data=request.data, workspace=self.workspace)
        return Response(WalkInEnquirySerializer(enquiry).data)
