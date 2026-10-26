from urllib.parse import parse_qs, urlparse
from unittest.mock import patch

from django.core import mail
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.staff.services.admin.lawyers.admin_lawyer_create_service import AdminLawyerCreateService
from apps.users.models import User


class StaffSignInLinkTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="link-owner@example.com", password="pass", first_name="Link", last_name="Owner",
            phone_number="+254711300001", national_id_number="LINKOWNER001", role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(name="Link Firm", registration_number="LINK-001", owner=self.owner)
        lawyer, self.temp_password = AdminLawyerCreateService.create_lawyer(
            law_firm=self.firm, created_by=self.owner,
            validated_data={
                "first_name": "Mary", "last_name": "Advocate", "email": "link-advocate@example.com",
                "phone_number": "+254711300002", "national_id_number": "LINKADV001",
                "admission_number": "P.105/9/20", "date_hired": "2026-01-01",
            },
        )
        self.staff = lawyer.user
        self.client.force_authenticate(self.owner)

    def test_owner_gets_a_one_time_link_that_sets_the_password(self):
        response = self.client.post(reverse("admin-staff-sign-in-link"), {"email": self.staff.email}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response['Cache-Control'], 'no-store')
        self.assertTrue(response.data['email_sent'])
        self.staff.refresh_from_db()
        self.assertTrue(self.staff.check_password(self.temp_password))
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(response.data["link"], mail.outbox[0].body)

        query = parse_qs(urlparse(response.data["link"]).query)
        body = {"uid": query["uid"][0], "token": query["token"][0],
                "new_password": "Own#Pass2026", "confirm_password": "Own#Pass2026"}
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post("/api/auth/reset-password/", body, format="json").status_code, 200)
        self.assertEqual(self.client.post("/api/auth/reset-password/", body, format="json").status_code, 400)
        self.staff.refresh_from_db()
        self.assertTrue(self.staff.check_password("Own#Pass2026"))
        self.assertFalse(self.staff.must_change_password)

    def test_only_this_firms_staff_can_be_sent_a_link(self):
        outsider = User.objects.create_user(
            email="outsider@example.com", password="pass", first_name="Out", last_name="Sider",
            phone_number="+254711300003", national_id_number="OUTSIDER001", role=UserRole.STAFF,
        )
        for email in (outsider.email, self.owner.email, ""):
            response = self.client.post(reverse("admin-staff-sign-in-link"), {"email": email}, format="json")
            self.assertEqual(response.status_code, 400, email)

        self.client.force_authenticate(self.staff)
        response = self.client.post(reverse("admin-staff-sign-in-link"), {"email": self.staff.email}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_email_failure_returns_a_shareable_link(self):
        for delivery in (0, OSError('Email unavailable')):
            with self.subTest(delivery=delivery):
                options = {'side_effect': delivery} if isinstance(delivery, Exception) else {'return_value': delivery}
                with patch('apps.staff.views.admin.staff_sign_in_link_view.send_mail', **options):
                    response = self.client.post(reverse('admin-staff-sign-in-link'), {'email': self.staff.email}, format='json')
                self.assertEqual(response.status_code, 200)
                self.assertFalse(response.data['email_sent'])
                self.assertIn('Email could not be sent', response.data['detail'])
                self.assertIn('token=', response.data['link'])
                self.assertEqual(response['Cache-Control'], 'no-store')
