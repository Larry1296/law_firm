from datetime import date

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.cases.models import Case
from apps.clients.models import Client
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.staff.models import Lawyer, LawyerPermission, LawyerPermissionGrant, Secretary
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
        suffix_code = sum(ord(char) for char in suffix) % 100000
        admin = User.objects.create_user(
            email=f"admin-{suffix}@example.com",
            password="strong-pass123",
            first_name="Admin",
            last_name=suffix.title(),
            phone_number=f"+2547001{suffix_code:05d}",
            national_id_number=f"9000{suffix_code:05d}",
            role=UserRole.ADMIN,
        )
        return LawFirm.objects.create(
            name=f"Law Firm {suffix}",
            registration_number=f"LAW-FIRM-{suffix.upper()}",
            owner=admin,
        )

    def create_lawyer(self, firm, *, email, staff_number, admission_number):
        staff_code = sum(ord(char) for char in staff_number) % 100000
        user = User.objects.create_user(
            email=email,
            password="strong-pass123",
            first_name="Case",
            last_name="Lawyer",
            phone_number=f"+254711{staff_code:06d}"[:13],
            national_id_number=f"LAW{staff_code:08d}"[:20],
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


    def create_secretary(self, firm, *, email="secretary@example.com", staff_number="SEC-001"):
        staff_code = sum(ord(char) for char in staff_number) % 100000
        user = User.objects.create_user(
            email=email,
            password="strong-pass123",
            first_name="Case",
            last_name="Secretary",
            phone_number=f"+254722{staff_code:06d}"[:13],
            national_id_number=f"SEC{staff_code:08d}"[:20],
            role=UserRole.STAFF,
        )
        return Secretary.objects.create(
            user=user,
            law_firm=firm,
            staff_number=staff_number,
            date_hired=date(2026, 1, 2),
        )

    def grant_lawyer_permission(self, lawyer, code):
        return LawyerPermissionGrant.objects.create(
            lawyer=lawyer,
            code=code,
            is_active=True,
            granted_by=lawyer.law_firm.owner,
        )

    def matter_create_payload(self, firm, client, *, assigned_lawyer_id=None, assigned_secretary_id=None, title="Lawyer Created Matter"):
        payload = {
            "client_id": str(client.id),
            "title": title,
            "description": "Matter opened from the lawyer portal.",
            "entry_route": Case.EntryRoute.NEW_INSTRUCTION,
            "case_type": Case.CaseType.CIVIL,
            "practice_area": Case.PracticeArea.CIVIL_COMMERCIAL_LITIGATION,
            "matter_nature": Case.MatterNature.CONTENTIOUS,
            "forum": Case.Forum.COURT,
            "procedure_type": Case.ProcedureTrack.CIVIL_SUIT,
            "procedure_track": Case.ProcedureTrack.CIVIL_SUIT,
            "priority": Case.Priority.MEDIUM,
            "client_party_role": "PLAINTIFF",
            "defendant": "Metro Data Systems Limited",
        }
        if assigned_lawyer_id:
            payload["assigned_lawyer_membership_id"] = str(assigned_lawyer_id)
        if assigned_secretary_id:
            payload["assigned_secretary_membership_id"] = str(assigned_secretary_id)
        return payload

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
        matter_status = Case.MatterStatus.CLOSED if status == Case.Status.CLOSED else Case.MatterStatus.ACTIVE
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
            matter_status=matter_status,
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

    def test_lawyer_create_options_requires_create_permission(self):
        firm = self.create_firm(suffix="createoptions")
        lawyer = self.create_lawyer(
            firm,
            email="create-options-lawyer@example.com",
            staff_number="LAW-CREATE-OPT-001",
            admission_number="ADV-CREATE-OPT-001",
        )
        self.client.force_authenticate(user=lawyer.user)

        denied = self.client.get(reverse("lawyer-case-create-options"))
        self.assertEqual(denied.status_code, 403, denied.data)

        self.grant_lawyer_permission(lawyer, LawyerPermission.CREATE_CASES)
        allowed = self.client.get(reverse("lawyer-case-create-options"))
        self.assertEqual(allowed.status_code, 200, allowed.data)
        self.assertIn(LawyerPermission.CREATE_CASES, allowed.data["permissions"])
        self.assertEqual(allowed.data["current_lawyer"]["id"], str(lawyer.id))
        self.assertFalse(allowed.data["can_assign_other_lawyer"])
        self.assertEqual([item["id"] for item in allowed.data["lawyers"]], [str(lawyer.id)])

    def test_permitted_lawyer_can_create_matter_and_defaults_to_self(self):
        firm = self.create_firm(suffix="lawcreate")
        lawyer = self.create_lawyer(
            firm,
            email="lawyer-create@example.com",
            staff_number="LAW-CREATE-001",
            admission_number="ADV-CREATE-001",
        )
        secretary = self.create_secretary(firm, email="law-create-secretary@example.com", staff_number="SEC-CREATE-001")
        client = self.create_client(
            firm,
            name="Lawyer Create Client",
            email="lawyer-create-client@example.com",
            national_id="LAWYER-CREATE-CLIENT",
        )
        self.grant_lawyer_permission(lawyer, LawyerPermission.CREATE_CASES)

        self.client.force_authenticate(user=lawyer.user)
        response = self.client.post(
            reverse("lawyer-cases"),
            self.matter_create_payload(firm, client, assigned_secretary_id=secretary.id),
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        case = Case.objects.get(id=response.data["case"]["id"])
        self.assertEqual(case.created_by, lawyer.user)
        self.assertEqual(case.assigned_lawyer, lawyer)
        self.assertEqual(case.assigned_secretary, secretary)
        self.assertEqual(case.entry_route, Case.EntryRoute.NEW_INSTRUCTION)
        self.assertEqual(case.matter_status, Case.MatterStatus.INSTRUCTIONS_RECEIVED)
        self.assertEqual(case.court_stage, Case.CourtStage.NOT_FILED)
        self.assertTrue(case.parties.filter(client=client, is_our_client=True).exists())
        self.assertTrue(case.activities.filter(action="MATTER_OPENED").exists())

    def test_lawyer_without_create_permission_cannot_create_matter(self):
        firm = self.create_firm(suffix="nopermcreate")
        lawyer = self.create_lawyer(
            firm,
            email="no-create-lawyer@example.com",
            staff_number="LAW-NO-CREATE-001",
            admission_number="ADV-NO-CREATE-001",
        )
        client = self.create_client(
            firm,
            name="No Permission Client",
            email="no-permission-client@example.com",
            national_id="NO-PERMISSION-CLIENT",
        )

        self.client.force_authenticate(user=lawyer.user)
        response = self.client.post(
            reverse("lawyer-cases"),
            self.matter_create_payload(firm, client),
            format="json",
        )

        self.assertEqual(response.status_code, 403, response.data)
        self.assertFalse(Case.objects.filter(title="Lawyer Created Matter").exists())

    def test_ordinary_lawyer_cannot_assign_another_responsible_advocate(self):
        firm = self.create_firm(suffix="assignblock")
        lawyer = self.create_lawyer(
            firm,
            email="assign-block-lawyer@example.com",
            staff_number="LAW-ASSIGN-BLOCK-001",
            admission_number="ADV-ASSIGN-BLOCK-001",
        )
        other_lawyer = self.create_lawyer(
            firm,
            email="assign-block-other@example.com",
            staff_number="LAW-ASSIGN-BLOCK-002",
            admission_number="ADV-ASSIGN-BLOCK-002",
        )
        client = self.create_client(
            firm,
            name="Assignment Block Client",
            email="assignment-block-client@example.com",
            national_id="ASSIGNMENT-BLOCK-CLIENT",
        )
        self.grant_lawyer_permission(lawyer, LawyerPermission.CREATE_CASES)

        self.client.force_authenticate(user=lawyer.user)
        response = self.client.post(
            reverse("lawyer-cases"),
            self.matter_create_payload(firm, client, assigned_lawyer_id=other_lawyer.id),
            format="json",
        )

        self.assertEqual(response.status_code, 403, response.data)
        self.assertFalse(Case.objects.filter(title="Lawyer Created Matter").exists())

    def test_lawyer_with_reassignment_permission_can_assign_another_advocate(self):
        firm = self.create_firm(suffix="assignallow")
        lawyer = self.create_lawyer(
            firm,
            email="assign-allow-lawyer@example.com",
            staff_number="LAW-ASSIGN-ALLOW-001",
            admission_number="ADV-ASSIGN-ALLOW-001",
        )
        other_lawyer = self.create_lawyer(
            firm,
            email="assign-allow-other@example.com",
            staff_number="LAW-ASSIGN-ALLOW-002",
            admission_number="ADV-ASSIGN-ALLOW-002",
        )
        client = self.create_client(
            firm,
            name="Assignment Allow Client",
            email="assignment-allow-client@example.com",
            national_id="ASSIGNMENT-ALLOW-CLIENT",
        )
        self.grant_lawyer_permission(lawyer, LawyerPermission.CREATE_CASES)
        self.grant_lawyer_permission(lawyer, LawyerPermission.ASSIGN_OTHER_LAWYER)

        self.client.force_authenticate(user=lawyer.user)
        response = self.client.post(
            reverse("lawyer-cases"),
            self.matter_create_payload(firm, client, assigned_lawyer_id=other_lawyer.id),
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        case = Case.objects.get(id=response.data["case"]["id"])
        self.assertEqual(case.created_by, lawyer.user)
        self.assertEqual(case.assigned_lawyer, other_lawyer)

    def test_lawyer_cannot_create_for_cross_firm_client(self):
        firm = self.create_firm(suffix="crossfirmone")
        other_firm = self.create_firm(suffix="crossfirmtwo")
        lawyer = self.create_lawyer(
            firm,
            email="cross-firm-lawyer@example.com",
            staff_number="LAW-CROSS-FIRM-001",
            admission_number="ADV-CROSS-FIRM-001",
        )
        other_client = self.create_client(
            other_firm,
            name="Cross Firm Client",
            email="cross-firm-client@example.com",
            national_id="CROSS-FIRM-CLIENT",
        )
        self.grant_lawyer_permission(lawyer, LawyerPermission.CREATE_CASES)

        self.client.force_authenticate(user=lawyer.user)
        response = self.client.post(
            reverse("lawyer-cases"),
            self.matter_create_payload(firm, other_client),
            format="json",
        )

        self.assertEqual(response.status_code, 404, response.data)
        self.assertFalse(Case.objects.filter(client=other_client).exists())
