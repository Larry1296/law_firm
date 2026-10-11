from datetime import date

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.common.choices import FirmRole, UserRole
from apps.firm.models import LawFirm, LawFirmMember
from apps.notifications.models import Notification
from apps.staff.models import Lawyer
from apps.users.models import User

PASSWORD = "Kenya-Law-2026!"


class PlatformNotificationTests(TestCase):
    def setUp(self):
        self.platform_admin = User.objects.create_platform_admin(
            email="ops@sheriamaster.test", password=PASSWORD, first_name="Platform",
            last_name="Operator", phone_number="PLATFORM-1", national_id_number="PLATFORM-1",
        )
        self.owner = User.objects.create_user(
            email="owner@otieno.test", password=PASSWORD, first_name="Mary", last_name="Otieno",
            phone_number="+254744000001", national_id_number="44000001", role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(name="Otieno & Co. Advocates", registration_number="BN-N-1", owner=self.owner)
        LawFirmMember.objects.create(firm=self.firm, user=self.owner, role=FirmRole.LAWYER, created_by=self.owner)
        Lawyer.objects.create(
            user=self.owner, law_firm=self.firm, staff_number="ADV-1",
            admission_number="P.105/1/10", date_hired=date(2010, 1, 1),
        )

    def bell(self, user):
        api = APIClient()
        api.force_authenticate(user)
        return api.get("/api/notifications/", {"unread": "true"}).data

    def test_registration_request_rings_the_platform_bell_only(self):
        response = APIClient().post("/api/platform/onboarding-requests/submit/", {
            "firm_name": "Kamau Advocates", "contact_name": "Peter Kamau",
            "email": "peter@kamau.test", "phone_number": "+254722000000",
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)

        bell = self.bell(self.platform_admin)
        self.assertEqual(bell["unread_count"], 1)
        notice = bell["notifications"][0]
        self.assertEqual(notice["notification_type"], Notification.NotificationType.FIRM_ONBOARDING)
        self.assertIn("Kamau Advocates", notice["title"])
        self.assertTrue(notice["action_url"].startswith("/platform/requests"))
        self.assertEqual(self.bell(self.owner)["unread_count"], 0)

        api = APIClient()
        api.force_authenticate(self.platform_admin)
        read = api.post(f"/api/notifications/{notice['id']}/read/")
        self.assertEqual(read.status_code, 200)
        self.assertEqual(self.bell(self.platform_admin)["unread_count"], 0)

    @override_settings(ALLOW_PUBLIC_FIRM_SIGNUP=True)
    def test_self_service_signup_notifies_the_platform(self):
        response = APIClient().post("/api/auth/register-firm/", {
            "firm": {"name": "Wanjiru Advocates", "registration_number": "BN-2026-0042", "email": "info@wanjiru.test"},
            "admin": {
                "first_name": "Jane", "last_name": "Wanjiru", "email": "jane@wanjiru.test",
                "phone_number": "+254711000111", "national_id_number": "30111222",
                "admission_number": "P.105/9876/18", "password": PASSWORD, "confirm_password": PASSWORD,
            },
            "plan_code": "BASIC",
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        notice = self.bell(self.platform_admin)["notifications"][0]
        self.assertIn("Wanjiru Advocates", notice["title"])
        self.assertTrue(notice["action_url"].startswith("/platform/firms/"))

    def test_mpesa_payment_notifies_platform_and_confirmation_notifies_the_owner(self):
        owner_api = APIClient()
        owner_api.force_authenticate(self.owner)
        invoice = owner_api.post(
            "/api/subscription/invoices/", {"plan_code": "PRO", "billing_cycle": "MONTHLY"}, format="json",
        ).data
        paid = owner_api.post(
            f"/api/subscription/invoices/{invoice['id']}/payment/", {"mpesa_receipt": "SIB7XK2LQ9"}, format="json",
        )
        self.assertEqual(paid.status_code, 200, paid.data)
        platform_notice = self.bell(self.platform_admin)["notifications"][0]
        self.assertIn(invoice["number"], platform_notice["title"])
        self.assertTrue(platform_notice["action_url"].startswith("/platform/payments"))

        platform_api = APIClient()
        platform_api.force_authenticate(self.platform_admin)
        confirmed = platform_api.post(f"/api/platform/invoices/{invoice['id']}/confirm/")
        self.assertEqual(confirmed.status_code, 200, confirmed.data)
        owner_notice = self.bell(self.owner)["notifications"][0]
        self.assertEqual(owner_notice["notification_type"], Notification.NotificationType.SUBSCRIPTION)
        self.assertEqual(owner_notice["action_url"], "/admin/subscription")
