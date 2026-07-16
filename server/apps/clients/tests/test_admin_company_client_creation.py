from datetime import date, timedelta
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from apps.clients.models import Client, ClientAddress, ClientContact, CompanyClient
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.users.models import User


class AdminCompanyClientCreationTests(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        self.admin = User.objects.create_user(
            email="company-admin@example.com",
            password="strong-pass123",
            first_name="Company",
            last_name="Admin",
            phone_number="+254711000001",
            national_id_number="ADMIN-COMPANY-001",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(
            name="Company Client Test Firm",
            registration_number="FIRM-COMPANY-001",
            owner=self.admin,
        )
        self.api_client.force_authenticate(user=self.admin)
        self.url = reverse("admin-company-client-create")

    def payload(self, **overrides):
        data = {
            "company_name": "Rift Valley Logistics Limited",
            "trading_name": "RV Logistics",
            "registration_number": "PVT-TEST-2026-002",
            "kra_pin": "P000000002L",
            "company_type": CompanyClient.CompanyType.PRIVATE_LIMITED,
            "incorporation_date": "2021-06-10",
            "country_of_incorporation": "Kenya",
            "industry": "Transport and Logistics",
            "nature_of_business": "Road freight, warehousing and logistics services",
            "website": "https://rvlogistics.test",
            "company_status": CompanyClient.CompanyStatus.ACTIVE,
            "director_count": 4,
            "employee_count": 35,
            "beneficial_ownership_declared": True,
            "annual_returns_up_to_date": True,
            "compliance_notes": "Initial onboarding checks complete.",
            "email": "legal@rvlogistics.test",
            "phone_number": "+254700200001",
            "access_type": Client.AccessType.PROSPECT,
            "country": "Kenya",
            "county": "Nakuru",
            "city": "Nakuru",
            "street": "Kenyatta Avenue",
            "postal_code": "20100",
            "full_address": (
                "Rift Valley Logistics Limited, Kenyatta Avenue, Nakuru, Kenya"
            ),
            "contact_full_name": "Samuel Kiprotich",
            "contact_role_or_designation": "Company Secretary",
            "contact_email": "samuel.kiprotich@rvlogistics.test",
            "contact_phone_number": "+254700200002",
            "contact_national_id_number": "TEST-ID-200001",
        }
        data.update(overrides)
        return data

    def test_successful_company_creation_without_portal_access(self):
        response = self.api_client.post(
            self.url,
            self.payload(
                access_type=Client.AccessType.ASSISTED_CLIENT,
                email="assisted-rv@example.test",
                phone_number="",
                contact_phone_number="+254700200012",
                registration_number="PVT-ASSISTED-001",
                contact_national_id_number="TEST-ID-200012",
            ),
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        client = Client.objects.get(email="assisted-rv@example.test")
        self.assertIsNone(client.user)
        self.assertIsNone(response.data["portal_user"])
        self.assertIsNone(response.data["temp_password"])

    def test_successful_company_creation_with_prospect_portal_access(self):
        response = self.api_client.post(self.url, self.payload(), format="json")

        self.assertEqual(response.status_code, 201, response.data)
        client = Client.objects.get(email="legal@rvlogistics.test")
        profile = client.company_profile

        self.assertEqual(response.data["client"]["id"], str(client.id))
        self.assertEqual(response.data["profile"]["id"], profile.id)
        self.assertEqual(response.data["portal_user"]["email"], client.email)
        self.assertEqual(response.data["portal_user"]["role"], UserRole.PROSPECT)
        self.assertTrue(response.data["portal_user"]["is_active"])
        self.assertTrue(response.data["temp_password"])

    def test_kra_pin_is_saved_on_client(self):
        self.api_client.post(self.url, self.payload(), format="json")
        client = Client.objects.get(email="legal@rvlogistics.test")

        self.assertEqual(client.kra_pin, "P000000002L")
        company_fields = [field.name for field in client.company_profile._meta.fields]
        self.assertNotIn("kra_pin", company_fields)

    def test_all_company_profile_fields_are_saved(self):
        self.api_client.post(self.url, self.payload(), format="json")
        profile = CompanyClient.objects.get(registration_number="PVT-TEST-2026-002")

        self.assertEqual(profile.company_name, "Rift Valley Logistics Limited")
        self.assertEqual(profile.trading_name, "RV Logistics")
        self.assertEqual(profile.company_type, CompanyClient.CompanyType.PRIVATE_LIMITED)
        self.assertEqual(profile.incorporation_date, date(2021, 6, 10))
        self.assertEqual(profile.country_of_incorporation, "Kenya")
        self.assertEqual(profile.industry, "Transport and Logistics")
        self.assertEqual(
            profile.nature_of_business,
            "Road freight, warehousing and logistics services",
        )
        self.assertEqual(profile.website, "https://rvlogistics.test")
        self.assertEqual(profile.company_status, CompanyClient.CompanyStatus.ACTIVE)
        self.assertEqual(profile.director_count, 4)
        self.assertEqual(profile.employee_count, 35)
        self.assertTrue(profile.beneficial_ownership_declared)
        self.assertTrue(profile.annual_returns_up_to_date)
        self.assertEqual(profile.compliance_notes, "Initial onboarding checks complete.")
        self.assertFalse(profile.registration_verified)
        self.assertIsNone(profile.registration_verified_at)
        self.assertIsNone(profile.registration_verified_by)

    def test_registered_address_is_created(self):
        self.api_client.post(self.url, self.payload(), format="json")
        client = Client.objects.get(email="legal@rvlogistics.test")

        address = ClientAddress.objects.get(client=client)
        self.assertEqual(address.address_type, ClientAddress.AddressType.REGISTERED)
        self.assertEqual(address.full_address, self.payload()["full_address"])
        self.assertTrue(address.is_primary)

    def test_primary_contact_is_created(self):
        self.api_client.post(self.url, self.payload(), format="json")
        client = Client.objects.get(email="legal@rvlogistics.test")

        contact = ClientContact.objects.get(client=client)
        self.assertEqual(contact.full_name, "Samuel Kiprotich")
        self.assertEqual(contact.role_or_designation, "Company Secretary")
        self.assertEqual(contact.email, "samuel.kiprotich@rvlogistics.test")
        self.assertTrue(contact.is_primary)

    def test_portal_user_is_linked_through_client_user(self):
        self.api_client.post(self.url, self.payload(), format="json")
        client = Client.objects.get(email="legal@rvlogistics.test")

        self.assertIsNotNone(client.user)
        self.assertEqual(client.user.email, "legal@rvlogistics.test")
        self.assertFalse(hasattr(client.company_profile, "user"))

    def test_temporary_password_is_returned_only_on_creation(self):
        create_response = self.api_client.post(self.url, self.payload(), format="json")
        client = Client.objects.get(email="legal@rvlogistics.test")
        detail_response = self.api_client.get(
            reverse("admin-client-detail", kwargs={"client_id": str(client.id)})
        )

        self.assertTrue(create_response.data["temp_password"])
        self.assertNotIn("temp_password", detail_response.data["client"]["detail"])

    def test_duplicate_registration_number_is_rejected_case_insensitively(self):
        CompanyClient.objects.create(
            client=Client.objects.create(
                firm=self.firm,
                created_by=self.admin,
                full_name="Existing Company",
                client_type=Client.ClientType.COMPANY,
                access_type=Client.AccessType.ASSISTED_CLIENT,
            ),
            company_name="Existing Company",
            registration_number="PVT-TEST-2026-002",
        )

        response = self.api_client.post(
            self.url,
            self.payload(registration_number="pvt-test-2026-002"),
            format="json",
        )

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("registration_number", response.data["errors"])

    def test_duplicate_login_email_is_rejected(self):
        User.objects.create_user(
            email="legal@rvlogistics.test",
            password="strong-pass123",
            first_name="Existing",
            last_name="User",
            phone_number="+254711000010",
            national_id_number="EXISTING-EMAIL-1",
            role=UserRole.PROSPECT,
        )

        response = self.api_client.post(self.url, self.payload(), format="json")

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("email", response.data["errors"])

    def test_missing_prospect_email_is_rejected(self):
        response = self.api_client.post(
            self.url,
            self.payload(email=""),
            format="json",
        )

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("email", response.data["errors"])

    def test_missing_prospect_phone_is_rejected(self):
        response = self.api_client.post(
            self.url,
            self.payload(phone_number="", contact_phone_number=""),
            format="json",
        )

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("phone_number", response.data["errors"])

    def test_missing_authorised_contact_name_is_rejected(self):
        response = self.api_client.post(
            self.url,
            self.payload(contact_full_name=""),
            format="json",
        )

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("contact_full_name", response.data["errors"])

    def test_future_incorporation_date_is_rejected(self):
        future_date = timezone.localdate() + timedelta(days=1)

        response = self.api_client.post(
            self.url,
            self.payload(incorporation_date=future_date.isoformat()),
            format="json",
        )

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("incorporation_date", response.data["errors"])

    def test_failed_user_creation_rolls_back_client_and_profile(self):
        with patch(
            "apps.clients.services.admin.client_admin_create_service."
            "AuthService.create_user_with_temp_password",
            side_effect=ValidationError({"email": "Unable to create portal user."}),
        ):
            response = self.api_client.post(self.url, self.payload(), format="json")

        self.assertEqual(response.status_code, 400, response.data)
        self.assertFalse(Client.objects.filter(email="legal@rvlogistics.test").exists())
        self.assertFalse(
            CompanyClient.objects.filter(registration_number="PVT-TEST-2026-002").exists()
        )

    def test_company_client_has_no_direct_user_relationship(self):
        self.assertFalse(hasattr(CompanyClient, "user"))

    def test_existing_company_detail_api_includes_company_fields(self):
        self.api_client.post(self.url, self.payload(), format="json")
        client = Client.objects.get(email="legal@rvlogistics.test")

        response = self.api_client.get(
            reverse("admin-client-detail", kwargs={"client_id": str(client.id)})
        )

        self.assertEqual(response.status_code, 200, response.data)
        detail = response.data["client"]["detail"]
        self.assertEqual(detail["kra_pin"], "P000000002L")
        self.assertEqual(detail["type_profile"]["company_name"], "Rift Valley Logistics Limited")
        self.assertEqual(detail["type_profile"]["trading_name"], "RV Logistics")
        self.assertEqual(detail["type_profile"]["registration_number"], "PVT-TEST-2026-002")
        self.assertEqual(detail["type_profile"]["company_type"], CompanyClient.CompanyType.PRIVATE_LIMITED)
        self.assertEqual(detail["type_profile"]["country_of_incorporation"], "Kenya")
        self.assertEqual(detail["type_profile"]["industry"], "Transport and Logistics")
        self.assertTrue(detail["portal_access_exists"])
        self.assertEqual(detail["portal_login_email"], "legal@rvlogistics.test")
        self.assertEqual(detail["registered_address"]["full_address"], self.payload()["full_address"])
        self.assertEqual(detail["primary_contact"]["full_name"], "Samuel Kiprotich")
