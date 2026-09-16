from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.clients.models import Client
from apps.clients.serializers.client_detail_serializer import ClientDetailSerializer
from apps.clients.services.prospective_client_service import ProspectiveClientService, prospective_firm
from apps.staff.models import Lawyer


class ProspectiveClientCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        client = ProspectiveClientService.create(user=request.user, data=request.data)
        return Response({'client': ClientDetailSerializer(client).data, 'next_action': 'RECORD_PROPOSED_MATTER'}, status=201)


class ProspectivePortalInviteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, client_id):
        client = ProspectiveClientService.invite(user=request.user, client_id=client_id)
        return Response({'client': ClientDetailSerializer(client).data})


class ProspectiveEntryOptionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        firm = prospective_firm(request.user)
        clients = Client.objects.filter(firm=firm, is_active=True).exclude(lifecycle_status='ARCHIVED')
        lawyers = Lawyer.objects.filter(law_firm=firm, is_active=True, user__is_active=True).select_related('user')
        return Response({'clients': [{'value': str(c.id), 'label': c.full_name} for c in clients.order_by('full_name')],
                         'advocates': [{'value': str(l.id), 'label': l.user.full_name} for l in lawyers]})


class ProspectiveClientDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, client_id):
        client = get_object_or_404(Client, id=client_id, firm=prospective_firm(request.user))
        return Response({'client': ClientDetailSerializer(client).data})


class ClientOnboardingCompletionView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, client_id):
        from apps.clients.services.onboarding_completion_service import OnboardingCompletionService
        client = OnboardingCompletionService.save(user=request.user, client_id=client_id, data=request.data)
        return Response({'client': ClientDetailSerializer(client).data})
