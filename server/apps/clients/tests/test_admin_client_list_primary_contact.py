from django.test import TestCase

from apps.clients.models import Client, ClientContact
from apps.clients.serializers.admin.client_admin_list_serializer import ClientAdminListSerializer
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.users.models import User


class ClientAdminListPrimaryContactTests(TestCase):
    def test_list_serializer_exposes_primary_contact_summary(self):
        admin = User.objects.create_user(
            email="primary-contact-admin@example.test",
            password="strong-pass123",
            first_name="Primary",
            last_name="Admin",
            phone_number="+254700100100",
            national_id_number="PCADMIN001",
            role=UserRole.ADMIN,
        )
        firm = LawFirm.objects.create(
            name="Primary Contact Firm",
            registration_number="PCF-001",
            owner=admin,
        )
        client = Client.objects.create(
            firm=firm,
            created_by=admin,
            full_name="Blue Ridge Engineering Limited",
            client_type=Client.ClientType.COMPANY,
            lifecycle_status=Client.LifecycleStatus.PROSPECT,
        )
        ClientContact.objects.create(
            client=client,
            full_name="Mercy Wanjiku Njeri",
            phone_number="0722334455",
            email="petermusau28@gmail.com",
            national_id_number="UI26071801",
            role_or_designation="Legal And Compliance Manager",
            contact_type="PRIMARY",
            preferred_channel="PHONE",
            is_primary=True,
        )

        data = ClientAdminListSerializer(client).data

        self.assertEqual(data["primary_contact_name"], "Mercy Wanjiku Njeri")
        self.assertEqual(data["primary_contact"]["phone_number"], "0722334455")
        self.assertEqual(data["primary_contact"]["role_or_designation"], "Legal And Compliance Manager")
