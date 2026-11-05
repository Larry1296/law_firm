from datetime import date

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.cases.models import Case
from apps.clients.models import Client
from apps.common.choices import FirmRole, UserRole
from apps.firm.models import LawFirm, LawFirmMember
from apps.staff.models import Lawyer, Secretary
from apps.users.models import User


class WorkspaceSearchTests(TestCase):
    """A search opened in one firm finds only that firm's records, and only those the person may open."""

    def user(self, name, role=UserRole.STAFF):
        return User.objects.create_user(email=f"{name}@example.test", password="test", first_name=name,
            last_name="Mwangi", national_id_number=name, phone_number=name, role=role)

    def firm(self, key):
        owner = self.user(f"owner{key}", UserRole.ADMIN)
        firm = LawFirm.objects.create(owner=owner, name=f"{key} Advocates", registration_number=f"REG-{key}")
        lawyer = Lawyer.objects.create(user=self.user(f"advocate{key}"), law_firm=firm, staff_number=f"A{key}",
            admission_number=f"A{key}", date_hired=date.today())
        LawFirmMember.objects.create(firm=firm, user=lawyer.user, role=FirmRole.LAWYER)
        return owner, firm, lawyer

    def matter(self, firm, owner, lawyer, client_name, title, number):
        client = Client.objects.create(firm=firm, created_by=owner, full_name=client_name, client_type="INDIVIDUAL")
        Case.objects.create(firm=firm, client=client, created_by=owner, case_number=number, title=title,
            case_type=Case.CaseType.CIVIL, court_type=Case.CourtType.HIGH_COURT, assigned_lawyer=lawyer)
        return client

    def setUp(self):
        self.owner, self.mutiso, self.advocate = self.firm("Mutiso")
        self.other_owner, self.other, self.other_advocate = self.firm("Otieno")
        self.matter(self.mutiso, self.owner, self.advocate, "Kamau Land Holdings", "Kamau land dispute", "HCCC 12/2026")
        # The same name in another firm must never show up in Mutiso's search.
        self.matter(self.other, self.other_owner, self.other_advocate, "Kamau Traders", "Kamau debt recovery", "HCCC 99/2026")
        self.colleague = Lawyer.objects.create(user=self.user("colleague"), law_firm=self.mutiso, staff_number="C1",
            admission_number="C1", date_hired=date.today())
        self.matter(self.mutiso, self.owner, self.colleague, "Kamau Family Trust", "Kamau trust deed", "ELC 3/2026")
        self.api = APIClient()

    def search(self, user, q):
        self.api.force_authenticate(user)
        response = self.api.get(reverse("workspace-search"), {"q": q})
        self.assertEqual(response.status_code, 200)
        return response.data

    def titles(self, data, kind):
        return sorted(row["title"] for row in data["results"] if row["kind"] == kind)

    def test_owner_searches_their_whole_firm_and_no_other(self):
        data = self.search(self.owner, "kamau")
        self.assertEqual(data["firm"], "Mutiso Advocates")
        self.assertEqual(self.titles(data, "matter"), ["Kamau land dispute", "Kamau trust deed"])
        self.assertEqual(self.titles(data, "client"), ["Kamau Family Trust", "Kamau Land Holdings"])
        self.assertNotIn("Kamau Traders", str(data))
        self.assertEqual(self.titles(self.search(self.owner, "advocateMutiso"), "staff"), ["advocateMutiso Mwangi"])
        self.assertEqual(self.search(self.owner, "advocateOtieno")["results"], [])

    def test_every_word_must_match(self):
        self.assertEqual(self.titles(self.search(self.owner, "kamau land"), "matter"), ["Kamau land dispute"])
        self.assertEqual(self.titles(self.search(self.owner, "12/2026"), "matter"), ["Kamau land dispute"])

    def test_advocate_sees_only_their_own_matters(self):
        data = self.search(self.advocate.user, "kamau")
        self.assertEqual(self.titles(data, "matter"), ["Kamau land dispute"])
        self.assertEqual(self.titles(self.search(self.advocate.user, "holdings"), "matter"), ["Kamau land dispute"])
        self.assertEqual(self.titles(data, "client"), [])
        self.assertEqual(self.titles(data, "staff"), [])

    def test_secretary_sees_the_firm_clients(self):
        secretary = Secretary.objects.create(user=self.user("secretary"), law_firm=self.mutiso, staff_number="S1", date_hired=date.today())
        data = self.search(secretary.user, "kamau")
        self.assertEqual(self.titles(data, "client"), ["Kamau Family Trust", "Kamau Land Holdings"])
        self.assertEqual(self.titles(data, "matter"), [])

    def test_short_query_and_person_without_firm_get_nothing(self):
        self.assertEqual(self.search(self.owner, "k")["results"], [])
        self.assertEqual(self.search(self.user("platform", UserRole.ADMIN), "kamau"), {"firm": "", "results": []})
