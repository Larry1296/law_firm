from datetime import date
from types import SimpleNamespace

from django.test import SimpleTestCase, TestCase
from django.urls import resolve, reverse
from rest_framework.test import APIClient

from apps.common.choices import UserRole
from apps.firm.models.law_firm import LawFirm
from apps.staff.models.lawyer import Lawyer
from apps.staff.serializers.admin.lawyers.admin_lawyer_detail_serializer import (
    AdminLawyerDetailSerializer,
)
from apps.users.models import User


class AdminLawyerUrlTests(SimpleTestCase):
    def test_admin_lawyers_detail_route_is_available(self):
        resolver = resolve("/api/admin/staff/lawyers/123e4567-e89b-12d3-a456-426614174000/")

        self.assertEqual(resolver.view_name, "admin-lawyer-detail")


class AdminLawyerDeleteEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            email="admin@example.com",
            password="strong-pass123",
            first_name="Admin",
            last_name="User",
            phone_number="+254700000010",
            national_id_number="123456780",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(
            name="Prime Law Advocates LLP",
            registration_number="REG-001",
            owner=self.admin_user,
        )

    def test_admin_lawyer_delete_endpoint_removes_lawyer_and_user_from_db(self):
        lawyer_user = User.objects.create_user(
            email="lawyer-delete@example.com",
            password="strong-pass123",
            first_name="Delete",
            last_name="Me",
            phone_number="+254700000011",
            national_id_number="123456781",
            role=UserRole.STAFF,
        )
        lawyer = Lawyer.objects.create(
            user=lawyer_user,
            law_firm=self.firm,
            staff_number="LAW-DELETE-001",
            admission_number="ADV-DELETE-001",
            date_hired=date(2024, 1, 1),
        )

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(
            reverse("admin-lawyer-delete", kwargs={"lawyer_id": str(lawyer.id)})
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(Lawyer.objects.filter(pk=lawyer.pk).exists())
        self.assertFalse(User.objects.filter(pk=lawyer_user.pk).exists())


class AdminLawyerDetailSerializerTests(SimpleTestCase):
    def test_serializer_includes_admin_analytics(self):
        lawyer = SimpleNamespace(
            id="da5a108c-ca57-4acd-b729-c00565dd5164",
            staff_number="LAW-0001",
            employee_number="EMP-0001",
            user=SimpleNamespace(
                full_name="Jane Mwangi",
                first_name="Jane",
                last_name="Mwangi",
                email="jane@lawfirm.com",
                phone_number="+254720000000",
                national_id_number="12345678",
            ),
            law_firm=SimpleNamespace(pk="c90d67d9-2351-4c93-a0e4-54d025f4c180", name="Prime Law Advocates LLP"),
            firm_role="LAWYER",
            department="Litigation",
            job_title="Lawyer",
            work_email="jane.mwangi@primelaw.com",
            work_phone="+254722222222",
            office_location="Nairobi Head Office",
            reports_to=None,
            admission_number="ADV-001",
            practicing_certificate_number="PC-001",
            bar_admission_date=date(2022, 1, 15),
            practice_areas=[],
            is_notary=False,
            can_commission_oaths=True,
            is_court_approved=True,
            employment_type="PERMANENT",
            employment_status="TERMINATED",
            date_hired=date(2026, 7, 4),
            probation_end_date=None,
            date_terminated=None,
            termination_reason="Deleted by administrator.",
            professional_summary="Litigation lawyer.",
            is_active=False,
            created_at="2026-07-04T09:30:55.935944+03:00",
            updated_at="2026-07-04T16:23:16.899797+03:00",
        )

        serializer = AdminLawyerDetailSerializer(lawyer)
        analytics = serializer.data["analytics"]

        self.assertEqual(analytics["engagement_health"], "at_risk")
        self.assertEqual(
            analytics["administrative_status"]["employment_status"],
            "TERMINATED",
        )
        self.assertEqual(analytics["professional_readiness"]["practice_area_count"], 0)
