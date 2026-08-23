from datetime import date
from unittest.mock import patch

from django.test import TestCase

from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.staff.models import Lawyer
from apps.staff.serializers.admin.lawyers.admin_lawyer_detail_serializer import (
    AdminLawyerDetailSerializer,
)
from apps.users.models import User


class AdvocateLocalizationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="advocate-localization@example.com",
            password="test-pass-123",
            first_name="Amina",
            last_name="Otieno",
            phone_number="+254700900002",
            national_id_number="900002",
            role=UserRole.STAFF,
        )
        owner = User.objects.create_user(
            email="advocate-owner@example.com",
            password="test-pass-123",
            first_name="Firm",
            last_name="Owner",
            phone_number="+254700900003",
            national_id_number="900003",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(
            name="Localization Advocates",
            registration_number="LF-LOCAL-001",
            owner=owner,
        )

    @patch("django.utils.timezone.localdate", return_value=date(2026, 8, 23))
    def test_exposes_certificate_expiry_and_completed_years_of_practice(self, _):
        advocate = Lawyer.objects.create(
            user=self.user,
            law_firm=self.firm,
            staff_number="ADV-LOCAL-001",
            admission_number="LSK-001",
            practicing_certificate_number="PC-2026-001",
            practicing_certificate_expiry=date(2026, 12, 31),
            bar_admission_date=date(2015, 9, 1),
            date_hired=date(2020, 1, 1),
        )
        data = AdminLawyerDetailSerializer(advocate).data
        self.assertEqual(data["practicing_certificate_expiry"], "2026-12-31")
        self.assertEqual(data["lsk_number"], "LSK-001")
        self.assertEqual(data["practicing_certificate_status"], "VALID")
        self.assertEqual(data["years_of_practice"], 10)
