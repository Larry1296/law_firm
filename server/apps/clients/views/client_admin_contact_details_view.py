from django.db import transaction
from rest_framework import status
from rest_framework.response import Response

from apps.audit_logs.services import AuditService
from apps.clients.models import Client
from apps.clients.serializers.client_detail_serializer import ClientDetailSerializer
from apps.clients.serializers.onboarding_serializers import AddressOnboardingSerializer, ContactOnboardingSerializer
from apps.clients.views.client_admin_base_view import ClientAdminBaseView


class _ClientDetailAddView(ClientAdminBaseView):
    """Adds an address or a contact to a client's record at any stage, not only during onboarding.

    The first one recorded becomes the primary; a later one marked primary takes over from the old.
    """

    serializer_class = None
    related_name = ""
    audit_action = ""

    def post(self, request, client_id):
        firm = self.get_firm()
        client = Client.objects.filter(id=client_id, firm=firm, is_active=True).first()
        if client is None:
            return Response({"detail": "Client not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        records = getattr(client, self.related_name)
        with transaction.atomic():
            is_primary = serializer.validated_data.get("is_primary") or not records.exists()
            if is_primary:
                records.update(is_primary=False)
            item = serializer.save(client=client, is_primary=is_primary)
        AuditService.record(firm=firm, user=request.user, action=self.audit_action, obj=client, new={"id": str(item.id)})
        return Response({"client": ClientDetailSerializer(client).data}, status=status.HTTP_201_CREATED)


class ClientAdminAddressCreateView(_ClientDetailAddView):
    serializer_class = AddressOnboardingSerializer
    related_name = "addresses"
    audit_action = "CLIENT_ADDRESS_ADDED"


class ClientAdminContactCreateView(_ClientDetailAddView):
    serializer_class = ContactOnboardingSerializer
    related_name = "contacts"
    audit_action = "CLIENT_CONTACT_ADDED"
