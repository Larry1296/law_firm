from datetime import date

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.cases.models import Case
from apps.clients.models import Client
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.staff.models import Lawyer
from apps.users.models import User


class LawyerCasesEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="lawyer@example.com",
            password="strong-pass123",
            first_name="Jane",
            last_name="Mwangi",
            phone_number="+254700000000",
        )

    def create_firm(self, *, suffix="one"):
        admin = User.objects.create_user(
            email=f"admin-{suffix}@example.com",
            password="strong-pass123",
            first_name="Admin",
            last_name=suffix.title(),
            phone_number=f"+2547001000{len(suffix):02d}",
            national_id_number=f"9000{len(suffix):04d}",
            role=UserRole.ADMIN,
        )
        return LawFirm.objects.create(
            name=f"Law Firm {suffix}",
            registration_number=f"LAW-FIRM-{suffix.upper()}",
            owner=admin,
        )

    def create_lawyer(self, firm, *, email, staff_number, admission_number):
        user = User.objects.create_user(
            email=email,
            password="strong-pass123",
            first_name="Case",
            last_name="Lawyer",
            phone_number=f"+2547{staff_number[-6:]}",
            national_id_number=f"ID-{staff_number}",
            role=UserRole.STAFF,
        )
        lawyer = Lawyer.objects.create(
            user=user,
            law_firm=firm,
            staff_number=staff_number,
            admission_number=admission_number,
            date_hired=date(2026, 1, 1),
        )
        return lawyer

    def create_client(self, firm, *, name, email, national_id):
        return Client.objects.create(
            firm=firm,
            full_name=name,
            email=email,
            phone_number="+254711000000",
            national_id=national_id,
            client_type=Client.ClientType.INDIVIDUAL,
            lifecycle_status=Client.LifecycleStatus.OFFICIAL_CLIENT,
            is_active=True,
        )

    def create_case(self, firm, client, lawyer, *, number, title, status=Case.Status.PENDING):
        return Case.objects.create(
            firm=firm,
            client=client,
            created_by=firm.owner,
            case_number=number,
            title=title,
            description="Test case",
            case_type=Case.CaseType.CIVIL,
            court_type=Case.CourtType.HIGH_COURT,
            status=status,
            assigned_lawyer=lawyer,
            plaintiff=client.full_name,
            defendant="Respondent",
        )

    def test_lawyer_cases_endpoint_requires_lawyer_profile(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse("lawyer-cases"))

        self.assertEqual(response.status_code, 403)

    def test_assigned_lawyer_sees_only_their_assigned_cases(self):
        firm = self.create_firm(suffix="assigned")
        lawyer = self.create_lawyer(
            firm,
            email="assigned-lawyer@example.com",
            staff_number="LAW-ASSIGNED-001",
            admission_number="ADV-ASSIGNED-001",
        )
        other_lawyer = self.create_lawyer(
            firm,
            email="other-lawyer@example.com",
            staff_number="LAW-ASSIGNED-002",
            admission_number="ADV-ASSIGNED-002",
        )
        client = self.create_client(
            firm,
            name="Assigned Client",
            email="assigned-client@example.com",
            national_id="ASSIGNED-CLIENT-001",
        )
        assigned_case = self.create_case(
            firm,
            client,
            lawyer,
            number="CASE-LAWYER-001",
            title="Assigned Lawyer Matter",
        )
        self.create_case(
            firm,
            client,
            other_lawyer,
            number="CASE-LAWYER-002",
            title="Other Lawyer Matter",
        )

        self.client.force_authenticate(user=lawyer.user)
        response = self.client.get(reverse("lawyer-cases"))

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data["cases"]), 1)
        self.assertEqual(response.data["cases"][0]["id"], str(assigned_case.id))
        self.assertEqual(response.data["cases"][0]["title"], "Assigned Lawyer Matter")

    def test_assigned_lawyer_case_detail_is_scoped_to_assignment(self):
        firm = self.create_firm(suffix="detail")
        lawyer = self.create_lawyer(
            firm,
            email="detail-lawyer@example.com",
            staff_number="LAW-DETAIL-001",
            admission_number="ADV-DETAIL-001",
        )
        other_lawyer = self.create_lawyer(
            firm,
            email="detail-other@example.com",
            staff_number="LAW-DETAIL-002",
            admission_number="ADV-DETAIL-002",
        )
        client = self.create_client(
            firm,
            name="Detail Client",
            email="detail-client@example.com",
            national_id="DETAIL-CLIENT-001",
        )
        assigned_case = self.create_case(
            firm,
            client,
            lawyer,
            number="CASE-DETAIL-001",
            title="Visible Detail Matter",
        )
        other_case = self.create_case(
            firm,
            client,
            other_lawyer,
            number="CASE-DETAIL-002",
            title="Hidden Detail Matter",
        )

        self.client.force_authenticate(user=lawyer.user)
        visible_response = self.client.get(
            reverse("lawyer-case-detail", kwargs={"case_id": assigned_case.id})
        )
        hidden_response = self.client.get(
            reverse("lawyer-case-detail", kwargs={"case_id": other_case.id})
        )

        self.assertEqual(visible_response.status_code, 200, visible_response.data)
        self.assertEqual(visible_response.data["case"]["id"], str(assigned_case.id))
        self.assertEqual(hidden_response.status_code, 404, hidden_response.data)

    def test_lawyer_cases_endpoint_filters_assigned_cases(self):
        firm = self.create_firm(suffix="filters")
        lawyer = self.create_lawyer(
            firm,
            email="filter-lawyer@example.com",
            staff_number="LAW-FILTER-001",
            admission_number="ADV-FILTER-001",
        )
        client = self.create_client(
            firm,
            name="Filter Client",
            email="filter-client@example.com",
            national_id="FILTER-CLIENT-001",
        )
        self.create_case(
            firm,
            client,
            lawyer,
            number="CASE-FILTER-001",
            title="Pending Employment Matter",
            status=Case.Status.PENDING,
        )
        closed_case = self.create_case(
            firm,
            client,
            lawyer,
            number="CASE-FILTER-002",
            title="Closed Property Matter",
            status=Case.Status.CLOSED,
        )

        self.client.force_authenticate(user=lawyer.user)
        response = self.client.get(reverse("lawyer-cases"), {"status": Case.Status.CLOSED})

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data["cases"]), 1)
        self.assertEqual(response.data["cases"][0]["id"], str(closed_case.id))
