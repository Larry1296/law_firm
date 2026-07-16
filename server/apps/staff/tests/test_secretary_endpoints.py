from datetime import date

from django.test import TestCase
from django.urls import resolve, reverse
from rest_framework.test import APIClient

from apps.cases.models import Case
from apps.clients.models import Client, NGOClient
from apps.common.choices import UserRole
from apps.firm.models.law_firm import LawFirm
from apps.staff.models import Lawyer, Secretary, SecretaryPermission, SecretaryPermissionGrant
from apps.users.models import User


class SecretaryUrlTests(TestCase):
    def test_admin_secretary_detail_route_is_available(self):
        resolver = resolve(
            "/api/admin/staff/secretaries/123e4567-e89b-12d3-a456-426614174000/"
        )
        self.assertEqual(resolver.view_name, "admin-secretary-detail")

    def test_secretary_dashboard_route_is_available(self):
        resolver = resolve("/api/staff/secretary/dashboard/")
        self.assertEqual(resolver.view_name, "secretary-dashboard")


class SecretaryEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            email="secretary-admin@example.com",
            password="strong-pass123",
            first_name="Admin",
            last_name="User",
            phone_number="+254711000001",
            national_id_number="711000001",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(
            name="Secretary Test Firm",
            registration_number="SEC-FIRM-001",
            owner=self.admin_user,
        )

    def create_lawyer(self, *, email, staff_number, admission_number):
        digits = "".join(ch for ch in staff_number if ch.isdigit()).rjust(6, "0")
        lawyer_user = User.objects.create_user(
            email=email,
            password="strong-pass123",
            first_name="Law",
            last_name=staff_number,
            phone_number=f"+2547{digits}",
            national_id_number=digits.rjust(9, "0"),
            role=UserRole.STAFF,
        )
        return Lawyer.objects.create(
            user=lawyer_user,
            law_firm=self.firm,
            staff_number=staff_number,
            admission_number=admission_number,
            date_hired=date(2026, 7, 6),
        )

    def test_admin_can_create_secretary(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.post(
            reverse("admin-secretary-create"),
            {
                "first_name": "Sarah",
                "last_name": "Secretary",
                "email": "sarah.secretary@example.com",
                "phone_number": "+254711000002",
                "national_id_number": "711000002",
                "date_hired": "2026-07-06",
                "permission_codes": [SecretaryPermission.MANAGE_CASES],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(
            Secretary.objects.filter(user__email="sarah.secretary@example.com").exists()
        )
        self.assertIn("temp_password", response.data)

    def test_secretary_dashboard_and_permission_gate(self):
        secretary_user = User.objects.create_user(
            email="secretary-user@example.com",
            password="strong-pass123",
            first_name="Sec",
            last_name="User",
            phone_number="+254711000003",
            national_id_number="711000003",
            role=UserRole.STAFF,
        )
        secretary = Secretary.objects.create(
            user=secretary_user,
            law_firm=self.firm,
            staff_number="SEC-TEST-001",
            date_hired=date(2026, 7, 6),
        )

        self.client.force_authenticate(user=secretary_user)

        dashboard_response = self.client.get(reverse("secretary-dashboard"))
        self.assertEqual(dashboard_response.status_code, 200)

        visible_cases_response = self.client.get(reverse("secretary-cases"))
        self.assertEqual(visible_cases_response.status_code, 200)

        visible_clients_response = self.client.get(reverse("secretary-clients"))
        self.assertEqual(visible_clients_response.status_code, 200)

        self.client.force_authenticate(user=self.admin_user)
        permission_response = self.client.post(
            reverse(
                "admin-secretary-permissions",
                kwargs={"secretary_id": str(secretary.id)},
            ),
            {"permission_codes": [SecretaryPermission.MANAGE_CASES]},
            format="json",
        )
        self.assertEqual(permission_response.status_code, 200)

        self.client.force_authenticate(user=secretary_user)
        allowed_cases_response = self.client.get(reverse("secretary-cases"))
        self.assertEqual(allowed_cases_response.status_code, 200)

    def test_secretary_without_manage_permission_can_view_secretarial_case_and_client_data(self):
        secretary_user = User.objects.create_user(
            email="secretary-viewer@example.com",
            password="strong-pass123",
            first_name="Sec",
            last_name="Viewer",
            phone_number="+254711000004",
            national_id_number="711000004",
            role=UserRole.STAFF,
        )
        secretary = Secretary.objects.create(
            user=secretary_user,
            law_firm=self.firm,
            staff_number="SEC-TEST-002",
            date_hired=date(2026, 7, 7),
        )
        lawyer = self.create_lawyer(
            email="secretary-case-lawyer@example.com",
            staff_number="LAW-SEC-001",
            admission_number="ADV-SEC-001",
        )
        secretary.assigned_lawyers.add(lawyer)
        client = Client.objects.create(
            firm=self.firm,
            created_by=self.admin_user,
            full_name="Client Viewer",
            email="client-viewer@example.com",
            phone_number="+254711000005",
            client_type=Client.ClientType.INDIVIDUAL,
            access_type=Client.AccessType.ASSISTED_CLIENT,
            lifecycle_status=Client.LifecycleStatus.OFFICIAL_CLIENT,
        )
        Case.objects.create(
            firm=self.firm,
            client=client,
            created_by=self.admin_user,
            case_number="SEC-VIEW-001",
            title="Secretary Visible Case",
            case_type=Case.CaseType.CIVIL,
            court_type=Case.CourtType.HIGH_COURT,
            assigned_lawyer=lawyer,
            assigned_secretary=secretary,
        )

        self.client.force_authenticate(user=secretary_user)

        cases_response = self.client.get(reverse("secretary-cases"))
        self.assertEqual(cases_response.status_code, 200, cases_response.data)
        self.assertEqual(len(cases_response.data["cases"]), 1)

        clients_response = self.client.get(reverse("secretary-clients"))
        self.assertEqual(clients_response.status_code, 200, clients_response.data)
        self.assertEqual(len(clients_response.data["clients"]), 1)

    def test_secretary_client_creation_requires_manage_clients_permission(self):
        secretary_user = User.objects.create_user(
            email="secretary-client-create-denied@example.com",
            password="strong-pass123",
            first_name="Sec",
            last_name="Denied",
            phone_number="+254711000009",
            national_id_number="711000009",
            role=UserRole.STAFF,
        )
        Secretary.objects.create(
            user=secretary_user,
            law_firm=self.firm,
            staff_number="SEC-TEST-004",
            date_hired=date(2026, 7, 7),
        )

        self.client.force_authenticate(user=secretary_user)
        response = self.client.post(
            reverse("secretary-client-create", kwargs={"client_type": "individuals"}),
            {
                "full_name": "Denied Client",
                "national_id": "711000010",
                "phone_number": "+254711000010",
                "access_type": Client.AccessType.ASSISTED_CLIENT,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403, response.data)
        self.assertFalse(Client.objects.filter(full_name="Denied Client").exists())

    def test_secretary_with_manage_clients_permission_can_create_client_category(self):
        secretary_user = User.objects.create_user(
            email="secretary-client-create@example.com",
            password="strong-pass123",
            first_name="Sec",
            last_name="Creator",
            phone_number="+254711000011",
            national_id_number="711000011",
            role=UserRole.STAFF,
        )
        secretary = Secretary.objects.create(
            user=secretary_user,
            law_firm=self.firm,
            staff_number="SEC-TEST-005",
            date_hired=date(2026, 7, 7),
        )
        SecretaryPermissionGrant.objects.create(
            secretary=secretary,
            code=SecretaryPermission.MANAGE_CLIENTS,
            granted_by=self.admin_user,
        )

        self.client.force_authenticate(user=secretary_user)
        response = self.client.post(
            reverse("secretary-client-create", kwargs={"client_type": "individuals"}),
            {
                "full_name": "Secretary Created Client",
                "national_id": "711000012",
                "phone_number": "+254711000012",
                "access_type": Client.AccessType.ASSISTED_CLIENT,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        created = Client.objects.get(full_name="Secretary Created Client")
        self.assertEqual(created.firm, self.firm)
        self.assertEqual(created.created_by, secretary_user)

        portal_response = self.client.post(
            reverse("secretary-client-create", kwargs={"client_type": "individuals"}),
            {
                "full_name": "Secretary Portal Client",
                "email": "secretary-portal-client@example.com",
                "national_id": "711000013",
                "phone_number": "+254711000013",
                "access_type": Client.AccessType.PROSPECT,
            },
            format="json",
        )

        self.assertEqual(portal_response.status_code, 201, portal_response.data)
        self.assertIn("temp_password", portal_response.data)
        portal_client = Client.objects.get(full_name="Secretary Portal Client")
        self.assertIsNotNone(portal_client.user)

    def test_secretary_religious_organization_keeps_specific_client_type(self):
        secretary_user = User.objects.create_user(
            email="secretary-religious-create@example.com",
            password="strong-pass123",
            first_name="Sec",
            last_name="Religious",
            phone_number="+254711000014",
            national_id_number="711000014",
            role=UserRole.STAFF,
        )
        secretary = Secretary.objects.create(
            user=secretary_user,
            law_firm=self.firm,
            staff_number="SEC-TEST-006",
            date_hired=date(2026, 7, 7),
        )
        SecretaryPermissionGrant.objects.create(
            secretary=secretary,
            code=SecretaryPermission.MANAGE_CLIENTS,
            granted_by=self.admin_user,
        )

        self.client.force_authenticate(user=secretary_user)
        response = self.client.post(
            reverse(
                "secretary-client-create",
                kwargs={"client_type": "religious-organizations"},
            ),
            {
                "ngo_name": "Mercy Faith Centre",
                "registration_number": "REL-SEC-001",
                "email": "mercy-faith@example.com",
                "phone_number": "+254711000015",
                "access_type": Client.AccessType.ASSISTED_CLIENT,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        created = Client.objects.get(full_name="Mercy Faith Centre")
        self.assertEqual(created.client_type, Client.ClientType.RELIGIOUS_ORGANIZATION)
        self.assertTrue(NGOClient.objects.filter(client=created).exists())
        self.assertEqual(portal_client.user.role, UserRole.PROSPECT)
        self.assertTrue(portal_client.user.must_change_password)

    def test_secretary_only_sees_cases_for_assigned_lawyers(self):
        secretary_user = User.objects.create_user(
            email="secretary-assigned-only@example.com",
            password="strong-pass123",
            first_name="Sec",
            last_name="Scoped",
            phone_number="+254711000006",
            national_id_number="711000006",
            role=UserRole.STAFF,
        )
        secretary = Secretary.objects.create(
            user=secretary_user,
            law_firm=self.firm,
            staff_number="SEC-TEST-003",
            date_hired=date(2026, 7, 7),
        )
        assigned_lawyer = self.create_lawyer(
            email="assigned-lawyer@example.com",
            staff_number="LAW-SEC-002",
            admission_number="ADV-SEC-002",
        )
        other_lawyer = self.create_lawyer(
            email="other-lawyer@example.com",
            staff_number="LAW-SEC-003",
            admission_number="ADV-SEC-003",
        )
        secretary.assigned_lawyers.add(assigned_lawyer)

        visible_client = Client.objects.create(
            firm=self.firm,
            created_by=self.admin_user,
            full_name="Visible Client",
            email="visible-client@example.com",
            phone_number="+254711000007",
            client_type=Client.ClientType.INDIVIDUAL,
            access_type=Client.AccessType.ASSISTED_CLIENT,
            lifecycle_status=Client.LifecycleStatus.OFFICIAL_CLIENT,
        )
        hidden_client = Client.objects.create(
            firm=self.firm,
            created_by=self.admin_user,
            full_name="Hidden Client",
            email="hidden-client@example.com",
            phone_number="+254711000008",
            client_type=Client.ClientType.INDIVIDUAL,
            access_type=Client.AccessType.ASSISTED_CLIENT,
            lifecycle_status=Client.LifecycleStatus.OFFICIAL_CLIENT,
        )
        visible_case = Case.objects.create(
            firm=self.firm,
            client=visible_client,
            created_by=self.admin_user,
            case_number="SEC-SCOPE-001",
            title="Visible Assigned Case",
            case_type=Case.CaseType.CIVIL,
            court_type=Case.CourtType.HIGH_COURT,
            assigned_lawyer=assigned_lawyer,
            assigned_secretary=secretary,
        )
        hidden_case = Case.objects.create(
            firm=self.firm,
            client=hidden_client,
            created_by=self.admin_user,
            case_number="SEC-SCOPE-002",
            title="Hidden Other Lawyer Case",
            case_type=Case.CaseType.CIVIL,
            court_type=Case.CourtType.HIGH_COURT,
            assigned_lawyer=other_lawyer,
        )

        self.client.force_authenticate(user=secretary_user)

        cases_response = self.client.get(reverse("secretary-cases"))
        self.assertEqual(cases_response.status_code, 200, cases_response.data)
        case_ids = {case["id"] for case in cases_response.data["cases"]}
        self.assertIn(str(visible_case.id), case_ids)
        self.assertNotIn(str(hidden_case.id), case_ids)

        visible_detail = self.client.get(
            reverse("secretary-case-detail", kwargs={"case_id": visible_case.id}),
        )
        self.assertEqual(visible_detail.status_code, 200, visible_detail.data)

        hidden_detail = self.client.get(
            reverse("secretary-case-detail", kwargs={"case_id": hidden_case.id}),
        )
        self.assertEqual(hidden_detail.status_code, 404)
