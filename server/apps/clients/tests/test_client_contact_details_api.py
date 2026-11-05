from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.clients.models import Client
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.users.models import User


class ClientContactDetailsApiTests(TestCase):
    """An official client's address and contacts can be recorded after the matter is open."""

    def setUp(self):
        self.admin = User.objects.create_user(
            email="owner@contact-details.test", password="strong-pass123", first_name="Owner", last_name="Advocate",
            phone_number="+254700101099", national_id_number="CD-ADMIN-1", role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(name="Contact Details Advocates", registration_number="FIRM-CD-1", owner=self.admin)
        self.client_record = Client.objects.create(
            firm=self.firm, full_name="Grace Mwende", phone_number="0711234567", client_type="INDIVIDUAL",
            lifecycle_status="OFFICIAL", created_by=self.admin,
        )
        self.api = APIClient()
        self.api.force_authenticate(self.admin)

    def test_the_first_address_becomes_primary_and_a_new_primary_takes_over(self):
        url = reverse("admin-client-address-create", args=[self.client_record.id])
        response = self.api.post(url, {"address_type": "HOME", "country": "Kenya", "county": "Machakos", "full_address": "Plot 12, Ngei Road, Machakos"}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(len(response.data["client"]["addresses"]), 1)
        self.assertTrue(self.client_record.addresses.get().is_primary)
        self.api.post(url, {"address_type": "POSTAL", "country": "Kenya", "full_address": "P.O. Box 100-90100 Machakos", "is_primary": True}, format="json")
        self.assertEqual(self.client_record.addresses.get(is_primary=True).address_type, "POSTAL")
        self.assertEqual(self.api.post(url, {"country": "Kenya"}, format="json").status_code, 400)

    def test_a_contact_is_recorded_for_the_client(self):
        url = reverse("admin-client-contact-create", args=[self.client_record.id])
        response = self.api.post(url, {"contact_type": "EMERGENCY", "full_name": "John Mwende", "phone_number": "0722000000", "preferred_channel": "PHONE"}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(self.client_record.contacts.get().full_name, "John Mwende")
