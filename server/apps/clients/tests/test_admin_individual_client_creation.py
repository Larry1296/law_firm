from datetime import date, timedelta
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.clients.models import (
    Client,
    ClientAddress,
    ClientContact,
    ContactType,
    IndividualClient,
)
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.staff.models import Secretary, SecretaryPermission, SecretaryPermissionGrant
from apps.users.models import User


class AdminIndividualClientCreationTests(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        self.admin = User.objects.create_user(
            email="individual-admin@example.com",
            password="strong-pass123",
            first_name="Individual",
            last_name="Admin",
            phone_number="+254712000001",
            national_id_number="ADMIN-IND-001",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(
            name="Individual Client Test Firm",
            registration_number="FIRM-IND-001",
            owner=self.admin,
        )
        self.api_client.force_authenticate(user=self.admin)
        self.url = reverse("admin-individual-client-create")

    def assisted_payload(self, **overrides):
        data = {
            "full_name": "Jane Akinyi Otieno",
            "first_name": "Jane",
            "middle_name": "Akinyi",
            "last_name": "Otieno",
            "phone_number": "+254733456789",
            "email": "",
            "access_type": Client.AccessType.ASSISTED,
            "identification_type": IndividualClient.IdentificationType.NATIONAL_ID,
            "identification_number": "23456789",
            "identification_country": "Kenya",
            "national_id": "23456789",
            "kra_pin": "a098765432c",
            "date_of_birth": "1979-02-11",
            "gender": IndividualClient.Gender.FEMALE,
            "occupation_status": IndividualClient.OccupationStatus.SELF_EMPLOYED,
            "occupation": "Trader",
            "nationality": "Kenyan",
            "citizenship": "Kenya",
            "preferred_language": "Kiswahili",
            "preferred_contact_channel": "PHONE",
            "country": "Kenya",
            "county": "Kisumu",
            "city": "Kisumu",
            "street": "Milimani",
            "address_description": "Milimani, Kisumu",
            "full_address": "Milimani, Kisumu",
            "privacy_notice_version": "2026-07",
            "personal_data_source": IndividualClient.PersonalDataSource.CLIENT,
            "next_of_kin_name": "Mary Anyango Otieno",
            "next_of_kin_relationship": "Sister",
            "next_of_kin_phone": "+254723456781",
            "next_of_kin_email": "mary.anyango@example.test",
        }
        data.update(overrides)
        return data

    def portal_payload(self, **overrides):
        data = {
            "full_name": "Peter Mwangi Kamau",
            "preferred_name": "Peter",
            "email": " PETER.MWANGI.UI@EXAMPLE.COM ",
            "phone_number": "+254712345678",
            "access_type": Client.AccessType.PORTAL_ENABLED,
            "identification_type": IndividualClient.IdentificationType.NATIONAL_ID,
            "identification_number": "12345678",
            "identification_country": "Kenya",
            "national_id": "12345678",
            "passport_number": "",
            "kra_pin": "a012345678b",
            "date_of_birth": "1988-06-17",
            "gender": IndividualClient.Gender.MALE,
            "marital_status": IndividualClient.MaritalStatus.MARRIED,
            "occupation_status": IndividualClient.OccupationStatus.EMPLOYED,
            "occupation": "Civil Engineer",
            "employer": "Metro Engineering Limited",
            "nationality": "Kenyan",
            "citizenship": "Kenya",
            "preferred_language": "English",
            "preferred_contact_channel": "EMAIL",
            "country": "Kenya",
            "county": "Nairobi",
            "city": "Nairobi",
            "street": "South B",
            "postal_code": "00100",
            "address_description": "South B, Nairobi",
            "full_address": "South B, Nairobi",
            "privacy_notice_version": "2026-07",
            "personal_data_source": IndividualClient.PersonalDataSource.CLIENT,
            "next_of_kin_name": "Mary Wanjiku Kamau",
            "next_of_kin_relationship": "Spouse",
            "next_of_kin_phone": "+254723456789",
            "next_of_kin_email": "mary.wanjiku@example.test",
        }
        data.update(overrides)
        return data

    def test_admin_creates_assisted_individual_without_user_or_password(self):
        user_count = User.objects.count()

        response = self.api_client.post(self.url, self.assisted_payload(), format="json")

        self.assertEqual(response.status_code, 201, response.data)
        client = Client.objects.get(full_name="Jane Akinyi Otieno")
        profile = IndividualClient.objects.get(client=client)

        self.assertEqual(client.client_type, Client.ClientType.INDIVIDUAL)
        self.assertEqual(client.access_type, Client.AccessType.ASSISTED)
        self.assertEqual(client.lifecycle_status, Client.LifecycleStatus.PROSPECTIVE)
        self.assertIsNone(client.user_id)
        self.assertEqual(User.objects.count(), user_count)
        self.assertIsNone(response.data["portal_user"])
        self.assertIsNone(response.data["temp_password"])
        self.assertFalse(response.data["client"]["portal_access_exists"])
        self.assertIsNone(response.data["client"]["portal_login_email"])
        self.assertEqual(profile.nationality, "Kenyan")
        self.assertEqual(profile.preferred_language, "Kiswahili")
        self.assertEqual(client.kra_pin, "A098765432C")

    def test_assisted_individual_address_and_next_of_kin_persist(self):
        self.api_client.post(self.url, self.assisted_payload(), format="json")
        client = Client.objects.get(full_name="Jane Akinyi Otieno")

        address = ClientAddress.objects.get(client=client)
        self.assertEqual(address.address_type, ClientAddress.AddressType.HOME)
        self.assertTrue(address.is_primary)
        self.assertEqual(address.full_address, "Milimani, Kisumu")

        next_of_kin = ClientContact.objects.get(
            client=client,
            contact_type=ContactType.EMERGENCY,
        )
        self.assertEqual(next_of_kin.full_name, "Mary Anyango Otieno")
        self.assertEqual(next_of_kin.role_or_designation, "Sister")
        self.assertEqual(next_of_kin.email, "mary.anyango@example.test")

    def test_admin_creates_portal_individual_with_linked_prospect_user(self):
        response = self.api_client.post(self.url, self.portal_payload(), format="json")

        self.assertEqual(response.status_code, 201, response.data)
        client = Client.objects.select_related("user").get(full_name="Peter Mwangi Kamau")
        profile = IndividualClient.objects.get(client=client)

        self.assertEqual(client.access_type, Client.AccessType.PORTAL_ENABLED)
        self.assertIsNotNone(client.user_id)
        self.assertEqual(client.user.email, "peter.mwangi.ui@example.com")
        self.assertEqual(client.user.role, UserRole.PROSPECT)
        self.assertTrue(client.user.must_change_password)
        self.assertEqual(response.data["portal_user"]["email"], client.user.email)
        self.assertEqual(response.data["portal_user"]["role"], UserRole.PROSPECT)
        self.assertTrue(response.data["temp_password"])
        self.assertNotEqual(client.user.password, response.data["temp_password"])
        self.assertTrue(client.user.check_password(response.data["temp_password"]))
        self.assertEqual(profile.preferred_name, "Peter")
        self.assertFalse(hasattr(profile, "user"))

    def test_portal_individual_requires_email_and_phone(self):
        email_response = self.api_client.post(
            self.url,
            self.portal_payload(email=""),
            format="json",
        )
        phone_response = self.api_client.post(
            self.url,
            self.portal_payload(
                email="peter.mwangi.two@example.test",
                phone_number="",
                national_id="12345679", identification_number="12345679",
            ),
            format="json",
        )

        self.assertEqual(email_response.status_code, 400, email_response.data)
        self.assertIn("email", email_response.data["errors"])
        self.assertEqual(phone_response.status_code, 400, phone_response.data)
        self.assertIn("phone_number", phone_response.data["errors"])

    def test_duplicate_individual_identity_is_rejected_before_creation(self):
        self.api_client.post(self.url, self.assisted_payload(), format="json")

        national_response = self.api_client.post(
            self.url,
            self.assisted_payload(
                full_name="Jane Duplicate",
                phone_number="+254733456780",
                kra_pin="A098765433C",
            ),
            format="json",
        )
        kra_response = self.api_client.post(
            self.url,
            self.assisted_payload(
                full_name="Jane KRA Duplicate",
                national_id="23456780", identification_number="23456780",
                phone_number="+254733456781",
            ),
            format="json",
        )

        self.assertEqual(national_response.status_code, 400, national_response.data)
        self.assertIn("identification_number", national_response.data["errors"])
        self.assertEqual(kra_response.status_code, 400, kra_response.data)
        self.assertIn("kra_pin", kra_response.data["errors"])
        self.assertFalse(Client.objects.filter(full_name="Jane Duplicate").exists())
        self.assertFalse(Client.objects.filter(full_name="Jane KRA Duplicate").exists())

    def test_duplicate_portal_email_is_rejected(self):
        User.objects.create_user(
            email="peter.mwangi.ui@example.com",
            password="strong-pass123",
            first_name="Existing",
            last_name="User",
            phone_number="+254712345679",
            national_id_number="EXISTING-PORTAL-1",
            role=UserRole.PROSPECT,
        )

        response = self.api_client.post(self.url, self.portal_payload(), format="json")

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("email", response.data["errors"])

    def test_future_date_of_birth_is_rejected(self):
        response = self.api_client.post(
            self.url,
            self.assisted_payload(
                date_of_birth=(timezone.localdate() + timedelta(days=1)).isoformat()
            ),
            format="json",
        )

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("date_of_birth", response.data["errors"])

    def test_response_shape_is_stable_for_assisted_and_portal(self):
        assisted_response = self.api_client.post(
            self.url,
            self.assisted_payload(),
            format="json",
        )
        portal_response = self.api_client.post(
            self.url,
            self.portal_payload(
                email="peter.mwangi.shape@example.test",
                phone_number="+254712345680",
                national_id="12345680", identification_number="12345680",
                kra_pin="A012345679B",
            ),
            format="json",
        )

        self.assertEqual(assisted_response.status_code, 201, assisted_response.data)
        self.assertEqual(portal_response.status_code, 201, portal_response.data)
        self.assertEqual(set(assisted_response.data.keys()), set(portal_response.data.keys()))
        self.assertIn("client", assisted_response.data)
        self.assertIn("profile", assisted_response.data)
        self.assertIn("primary_address", assisted_response.data)
        self.assertIn("next_of_kin", assisted_response.data)
        self.assertIn("portal_user", assisted_response.data)
        self.assertIn("temp_password", assisted_response.data)

    def test_temporary_password_is_not_exposed_on_detail(self):
        create_response = self.api_client.post(self.url, self.portal_payload(), format="json")
        client_id = create_response.data["client"]["id"]

        detail_response = self.api_client.get(
            reverse("admin-client-detail", kwargs={"client_id": client_id})
        )

        self.assertEqual(detail_response.status_code, 200, detail_response.data)
        self.assertNotIn("temp_password", detail_response.data["client"]["detail"])
        detail = detail_response.data["client"]["detail"]
        self.assertEqual(detail["type_profile"]["preferred_name"], "Peter")
        self.assertTrue(detail["portal_access_exists"])
        self.assertEqual(detail["portal_login_email"], "peter.mwangi.ui@example.com")

    def test_transaction_rolls_back_when_individual_profile_creation_fails(self):
        with patch(
            "apps.clients.services.admin.client_admin_create_service."
            "IndividualClient.objects.create",
            side_effect=RuntimeError("profile failed"),
        ):
            response = self.api_client.post(self.url, self.assisted_payload(), format="json")

        self.assertGreaterEqual(response.status_code, 400)
        self.assertFalse(Client.objects.filter(full_name="Jane Akinyi Otieno").exists())

    def test_secretary_with_manage_clients_permission_uses_same_individual_service(self):
        secretary_user = User.objects.create_user(
            email="individual-secretary@example.com",
            password="strong-pass123",
            first_name="Individual",
            last_name="Secretary",
            phone_number="+254712000002",
            national_id_number="SEC-IND-001",
            role=UserRole.STAFF,
        )
        secretary = Secretary.objects.create(
            user=secretary_user,
            law_firm=self.firm,
            staff_number="SEC-IND-001",
            date_hired=date(2026, 7, 7),
        )
        SecretaryPermissionGrant.objects.create(
            secretary=secretary,
            code=SecretaryPermission.MANAGE_CLIENTS,
            granted_by=self.admin,
        )

        self.api_client.force_authenticate(user=secretary_user)
        response = self.api_client.post(
            reverse("secretary-client-create", kwargs={"client_type": "individuals"}),
            self.assisted_payload(
                full_name="Secretary Created Individual",
                national_id="33456789", identification_number="33456789",
                phone_number="+254733456782",
                kra_pin="A198765432C",
            ),
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        client = Client.objects.get(full_name="Secretary Created Individual")
        self.assertEqual(client.created_by, secretary_user)
        self.assertEqual(client.client_type, Client.ClientType.INDIVIDUAL)
        self.assertIsNone(response.data["portal_user"])
        self.assertIsNone(response.data["temp_password"])


    def create_secretary_user(self, *, can_manage=True, email="secretary-extra@example.com"):
        secretary_user = User.objects.create_user(
            email=email,
            password="strong-pass123",
            first_name="Extra",
            last_name="Secretary",
            phone_number="+254712000099",
            national_id_number=email.upper()[:20],
            role=UserRole.STAFF,
        )
        secretary = Secretary.objects.create(
            user=secretary_user,
            law_firm=self.firm,
            staff_number=email.upper()[:20],
            date_hired=date(2026, 7, 7),
        )
        if can_manage:
            SecretaryPermissionGrant.objects.create(
                secretary=secretary,
                code=SecretaryPermission.MANAGE_CLIENTS,
                granted_by=self.admin,
            )
        return secretary_user

    def test_secretary_creates_portal_individual(self):
        secretary_user = self.create_secretary_user(email="secretary-portal@example.com")
        self.api_client.force_authenticate(user=secretary_user)

        response = self.api_client.post(
            reverse("secretary-client-create", kwargs={"client_type": "individuals"}),
            self.portal_payload(
                email="secretary.portal.client@example.com",
                national_id="42345678", identification_number="42345678",
                kra_pin="A212345678B",
            ),
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["client"]["access_type"], Client.AccessType.PORTAL_ENABLED)
        self.assertTrue(response.data["temp_password"])
        self.assertEqual(response.data["portal_user"]["email"], "secretary.portal.client@example.com")

    def test_secretary_without_manage_clients_permission_receives_403(self):
        secretary_user = self.create_secretary_user(can_manage=False, email="secretary-denied@example.com")
        self.api_client.force_authenticate(user=secretary_user)

        response = self.api_client.post(
            reverse("secretary-client-create", kwargs={"client_type": "individuals"}),
            self.assisted_payload(national_id="43456789", identification_number="43456789", kra_pin="A298765432C"),
            format="json",
        )

        self.assertEqual(response.status_code, 403, response.data)

    def test_lawyer_cannot_use_admin_individual_creation_route(self):
        lawyer_user = User.objects.create_user(
            email="lawyer-client-create@example.com",
            password="strong-pass123",
            first_name="No",
            last_name="Access",
            phone_number="+254712000077",
            national_id_number="LAW-NO-CLIENTS",
            role=UserRole.STAFF,
        )
        self.api_client.force_authenticate(user=lawyer_user)

        response = self.api_client.post(self.url, self.assisted_payload(), format="json")

        self.assertEqual(response.status_code, 403, response.data)

    def test_national_id_or_passport_is_required(self):
        response = self.api_client.post(
            self.url,
            self.assisted_payload(national_id="", passport_number="", identification_type="", identification_number=""),
            format="json",
        )

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("identification_type", response.data["errors"])

    def test_duplicate_passport_is_rejected(self):
        self.api_client.post(
            self.url,
            self.assisted_payload(national_id="", passport_number="AA123456", identification_type=IndividualClient.IdentificationType.PASSPORT, identification_number="AA123456", identification_country="Uganda", identification_expiry_date=(timezone.localdate() + timedelta(days=365)).isoformat()),
            format="json",
        )

        response = self.api_client.post(
            self.url,
            self.assisted_payload(
                full_name="Passport Duplicate",
                national_id="",
                passport_number="aa123456",
                identification_type=IndividualClient.IdentificationType.PASSPORT,
                identification_number="aa123456",
                identification_country="Uganda",
                identification_expiry_date=(timezone.localdate() + timedelta(days=365)).isoformat(),
                kra_pin="A398765432C",
            ),
            format="json",
        )

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("identification_number", response.data["errors"])

    def test_next_of_kin_missing_phone_is_not_replaced_with_client_phone(self):
        response = self.api_client.post(
            self.url,
            self.assisted_payload(next_of_kin_phone=""),
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        client = Client.objects.get(full_name="Jane Akinyi Otieno")
        next_of_kin = ClientContact.objects.get(client=client, contact_type=ContactType.EMERGENCY)
        self.assertEqual(next_of_kin.phone_number, "")

    def test_identification_is_not_automatically_verified(self):
        response = self.api_client.post(self.url, self.assisted_payload(), format="json")

        self.assertEqual(response.status_code, 201, response.data)
        client = Client.objects.get(full_name="Jane Akinyi Otieno")
        profile = IndividualClient.objects.get(client=client)
        self.assertFalse(client.is_verified)
        self.assertFalse(profile.identification_verified)

    def test_temporary_password_is_not_exposed_on_list(self):
        create_response = self.api_client.post(self.url, self.portal_payload(), format="json")
        self.assertEqual(create_response.status_code, 201, create_response.data)

        list_response = self.api_client.get(reverse("admin-client-list"))

        self.assertEqual(list_response.status_code, 200, list_response.data)
        self.assertNotIn("temp_password", str(list_response.data))

    def test_admin_and_secretary_individual_responses_have_identical_keys(self):
        admin_response = self.api_client.post(self.url, self.assisted_payload(), format="json")
        secretary_user = self.create_secretary_user(email="secretary-shape@example.com")
        self.api_client.force_authenticate(user=secretary_user)
        secretary_response = self.api_client.post(
            reverse("secretary-client-create", kwargs={"client_type": "individuals"}),
            self.assisted_payload(
                full_name="Secretary Shape Individual",
                national_id="53456789", identification_number="53456789",
                kra_pin="A498765432C",
            ),
            format="json",
        )

        self.assertEqual(admin_response.status_code, 201, admin_response.data)
        self.assertEqual(secretary_response.status_code, 201, secretary_response.data)
        self.assertEqual(set(admin_response.data.keys()), set(secretary_response.data.keys()))

    def test_legacy_individual_access_values_are_migrated(self):
        from importlib import import_module

        migration = import_module("apps.clients.migrations.0009_migrate_individual_access_type_values")
        legacy_portal = Client.objects.create(
            firm=self.firm,
            created_by=self.admin,
            full_name="Legacy Portal Individual",
            client_type=Client.ClientType.INDIVIDUAL,
            access_type=Client.AccessType.PROSPECT,
            lifecycle_status=Client.LifecycleStatus.PROSPECTIVE,
        )
        legacy_assisted = Client.objects.create(
            firm=self.firm,
            created_by=self.admin,
            full_name="Legacy Assisted Individual",
            client_type=Client.ClientType.INDIVIDUAL,
            access_type=Client.AccessType.ASSISTED_CLIENT,
            lifecycle_status=Client.LifecycleStatus.PROSPECTIVE,
        )

        class Apps:
            @staticmethod
            def get_model(app_label, model_name):
                return Client

        migration.forwards(Apps, None)
        legacy_portal.refresh_from_db()
        legacy_assisted.refresh_from_db()
        self.assertEqual(legacy_portal.access_type, Client.AccessType.PORTAL_ENABLED)
        self.assertEqual(legacy_assisted.access_type, Client.AccessType.ASSISTED)

        migration.backwards(Apps, None)
        legacy_portal.refresh_from_db()
        legacy_assisted.refresh_from_db()
        self.assertEqual(legacy_portal.access_type, Client.AccessType.PROSPECT)
        self.assertEqual(legacy_assisted.access_type, Client.AccessType.ASSISTED_CLIENT)
