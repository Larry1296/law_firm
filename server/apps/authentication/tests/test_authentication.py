from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.clients.models import Client
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.users.models import User


class PublicRegistrationDisabledTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="strong-pass123",
            first_name="Firm",
            last_name="Owner",
            phone_number="+254733000001",
            national_id_number="733000001",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(
            name="Registration Firm",
            registration_number="REG-FIRM-001",
            owner=self.owner,
            is_active=True,
        )

    def test_public_client_and_firm_registration_routes_do_not_exist(self):
        response = self.api.post(
            "/api/auth/register/",
            {
                "full_name": "Self Registered Client",
                "email": "self-client@example.com",
                "phone_number": "+254733000002",
                "national_id": "733000002",
                "client_type": Client.ClientType.INDIVIDUAL,
                "password": "strong-pass123",
            },
            format="json",
        )

        firm_response = self.api.post("/api/auth/register-firm/", {}, format="json")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(firm_response.status_code, 404)
        self.assertFalse(User.objects.filter(email="self-client@example.com").exists())


class AdminLoginPasswordResetTests(TestCase):
    def setUp(self):
        self.api = APIClient()

    def test_admin_created_normally_does_not_require_password_reset(self):
        user = User.objects.create_admin(
            email="admin-default@example.com",
            password="strong-pass123",
            first_name="Firm",
            last_name="Owner",
            phone_number="+254733000003",
            national_id_number="733000003",
        )

        self.assertFalse(user.must_change_password)

    def test_admin_login_preserves_required_password_change(self):
        user = User.objects.create_user(
            email="admin-stale@example.com",
            password="strong-pass123",
            first_name="Firm",
            last_name="Owner",
            phone_number="+254733000004",
            national_id_number="733000004",
            role=UserRole.ADMIN,
            must_change_password=True,
            is_staff=True,
        )

        response = self.api.post(
            reverse("login"),
            {
                "email": "admin-stale@example.com",
                "password": "strong-pass123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data["user"]["must_change_password"])

        user.refresh_from_db()
        self.assertTrue(user.must_change_password)


class PasswordResetFlowTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.user = User.objects.create_user(
            email="reset-user@example.com",
            password="old-pass123",
            first_name="Reset",
            last_name="User",
            phone_number="+254733000005",
            national_id_number="733000005",
            role=UserRole.PROSPECT,
            must_change_password=True,
        )

    def test_forgot_password_returns_generic_response_for_existing_user(self):
        response = self.api.post(
            reverse("forgot-password"),
            {"email": self.user.email},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(
            response.data["detail"],
            "Password reset link sent if email exists",
        )

    @override_settings(DEBUG=True)
    def test_reset_password_updates_user_password(self):
        forgot_response = self.api.post(
            reverse("forgot-password"),
            {"email": self.user.email},
            format="json",
        )
        self.assertEqual(forgot_response.status_code, 200, forgot_response.data)
        reset_data = forgot_response.data["debug"]

        response = self.api.post(
            reverse("reset-password"),
            {
                "uid": reset_data["uid"],
                "token": reset_data["token"],
                "new_password": "new-strong-pass123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("new-strong-pass123"))
        self.assertFalse(self.user.must_change_password)

    def test_reset_password_rejects_invalid_token(self):
        response = self.api.post(
            reverse("reset-password"),
            {
                "uid": "invalid",
                "token": "invalid",
                "new_password": "new-strong-pass123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400, response.data)


class AccountRecoveryTests(TestCase):
    def setUp(self):
        from django.core.cache import cache

        cache.clear()
        self.api = APIClient()
        self.user = User.objects.create_user(
            email="wanjiku@example.com", password="strong-pass123", first_name="Wanjiku",
            last_name="Kamau", phone_number="+254712345678", national_id_number="34299508",
        )

    def recover(self, **payload):
        return self.api.post(reverse("recover-account"), payload, format="json")

    def test_matching_national_id_emails_a_reset_link_to_the_account(self):
        from django.core import mail

        response = self.recover(national_id="34299508")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["wanjiku@example.com"])
        self.assertIn("/reset-password?uid=", mail.outbox[0].body)

    def test_phone_number_matches_in_local_format(self):
        from django.core import mail

        self.recover(phone_number="0712 345 678")
        self.assertEqual(len(mail.outbox), 1)

    def test_reply_does_not_reveal_whether_an_account_exists(self):
        from django.core import mail

        found = self.recover(national_id="34299508")
        missing = self.recover(national_id="99999999")
        mismatched = self.recover(national_id="34299508", phone_number="0700000000")
        self.assertEqual(found.data["detail"], missing.data["detail"])
        self.assertEqual(found.data["detail"], mismatched.data["detail"])
        self.assertNotIn("wanjiku", str(missing.data) + str(found.data.get("detail")))
        self.assertEqual(len(mail.outbox), 1)

    def test_an_identifier_is_required(self):
        self.assertEqual(self.recover().status_code, 400)


class TemporaryPasswordGateTests(TestCase):
    def setUp(self):
        from datetime import date

        from apps.common.choices import FirmRole
        from apps.firm.models import LawFirmMember
        from apps.staff.models import Lawyer

        self.api = APIClient()
        owner = User.objects.create_user(
            email="gate-owner@example.com", password="strong-pass123", first_name="Gate", last_name="Owner",
            phone_number="+254733100001", national_id_number="733100001", role=UserRole.ADMIN,
        )
        firm = LawFirm.objects.create(name="Gate Firm", registration_number="GATE-001", owner=owner, is_active=True)
        self.staff = User.objects.create_user(
            email="gate-advocate@example.com", password="temp-pass-2026", first_name="Gate", last_name="Advocate",
            phone_number="+254733100002", national_id_number="733100002", role=UserRole.STAFF,
            must_change_password=True,
        )
        LawFirmMember.objects.create(firm=firm, user=self.staff, role=FirmRole.LAWYER, created_by=owner, is_active=True)
        Lawyer.objects.create(
            user=self.staff, law_firm=firm, staff_number="ADV-GATE", admission_number="P.105/1/26",
            date_hired=date(2026, 1, 1),
        )

    def sign_in(self, password):
        response = self.api.post("/api/auth/login/", {"email": self.staff.email, "password": password}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.api.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        return response

    def test_temporary_password_blocks_work_until_changed(self):
        self.assertTrue(self.sign_in("temp-pass-2026").data["user"]["must_change_password"])

        blocked = self.api.get("/api/cases/")
        self.assertEqual(blocked.status_code, 403)
        self.assertEqual(blocked.data["code"], "password_change_required")
        self.assertEqual(self.api.get("/api/auth/me/").status_code, 200)

        changed = self.api.post(
            "/api/staff/lawyer/change-password/",
            {"current_password": "temp-pass-2026", "new_password": "Fresh#Pass2026", "confirm_password": "Fresh#Pass2026"},
            format="json",
        )
        self.assertEqual(changed.status_code, 200, changed.data)
        self.staff.refresh_from_db()
        self.assertFalse(self.staff.must_change_password)
        self.assertEqual(self.api.get("/api/cases/").status_code, 200)


class FirmPayloadContactTests(TestCase):
    def test_signed_in_members_get_their_firms_own_contact_details(self):
        from apps.authentication.services.auth_service import AuthService

        owner = User.objects.create_user(
            email="contact-owner@example.com", password="strong-pass123", first_name="Contact", last_name="Owner",
            phone_number="+254733000091", national_id_number="733000091", role=UserRole.ADMIN,
        )
        firm = LawFirm.objects.create(
            name="Kamau & Wanjiku Advocates", registration_number="CONTACT-001", owner=owner,
            physical_address="Ngong Road", town="Nairobi", county="Nairobi", phone_number="+254722123456",
            email="info@kamauwanjiku.co.ke",
        )

        contact = AuthService.firm_payload(firm)["contact"]

        self.assertEqual(contact, {"location": "Ngong Road, Nairobi, Nairobi", "phone_number": "+254722123456",
                                   "email": "info@kamauwanjiku.co.ke", "website": ""})
        self.assertIsNone(AuthService.firm_payload(None)["contact"])
