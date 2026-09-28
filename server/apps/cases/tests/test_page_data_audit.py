"""
Every page's API, for every role, returns real records for a live matter.

The matter is taken through the walkthrough up to the hearing, then each page
endpoint is called with a real JWT as the role that uses it. No endpoint may
fail, and none may return placeholder records.
"""

import json
import re
from datetime import date, timedelta

from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.cases.tests.test_end_to_end_litigation import EndToEndLitigationTests, make_user
from apps.common.choices import UserRole
from apps.staff.models import HR, IT

PLACEHOLDER = re.compile(r'"id": "[a-z-]+-00\d"|workspace ready|dashboard ready|Sample Client|Acme Holdings|Prepare draft pleadings')


class PageDataAuditTests(EndToEndLitigationTests):
    def test_walk_in_to_archive(self):
        """The full walkthrough runs in its own module; this class reuses its steps only."""

    def jwt_client(self, user):
        api = APIClient()
        api.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}")
        return api

    def fetch(self, user, url):
        response = self.jwt_client(user).get(url)
        self.assertEqual(response.status_code, 200, f"{url} as {user.email}: {getattr(response, 'data', response.content)}")
        body = json.dumps(response.data, default=str)
        self.assertIsNone(PLACEHOLDER.search(body), f"{url} returned placeholder data: {body[:300]}")
        return response.data

    def test_every_page_shows_real_records_for_its_role(self):
        client = self.step_reception_records_walk_in()
        check = self.step_advocate_records_proposed_matter(client)
        check = self.step_advocate_clears_conflict_and_accepts(client, check)
        self.step_secretary_opens_physical_kyc_file(client)
        self.step_advocate_completes_due_diligence(client)
        self.step_advocate_confirms_jurisdiction(client, check)
        self.step_engagement_signed_and_approved(client, check)
        client_user = self.step_client_invited_to_portal(client)
        matter = self.step_advocate_opens_matter(client, check)
        self.step_secretary_prepares_physical_file(matter)
        self.step_document_request_round_trip(matter, client_user)
        self.step_demand_letter_issued(matter)

        self.ok(self.as_user(self.advocate_user).post(f"/api/cases/{matter.id}/tasks/", {
            "title": "Draft witness statement for Peter Kamau", "task_type": "DOCUMENT_PREPARATION",
            "priority": "HIGH", "due_at": (timezone.now() + timedelta(days=3)).isoformat(),
        }, format="json"), 201)

        hr_user = make_user("hr@mwangi-advocates.test", UserRole.STAFF, "Lucy", "Achieng", "+254711000005")
        HR.objects.create(user=hr_user, law_firm=self.firm, staff_number="HR-005", date_hired=date(2023, 1, 1))
        it_user = make_user("it@mwangi-advocates.test", UserRole.STAFF, "Kevin", "Mutua", "+254711000006")
        IT.objects.create(user=it_user, law_firm=self.firm, staff_number="IT-006", date_hired=date(2023, 1, 1))

        c, m = client.id, matter.id
        pages = {
            self.partner: [
                "/api/admin/clients/", f"/api/admin/clients/{c}/", "/api/admin/firm/", "/api/admin/firm/settings/",
                "/api/admin/firm/branches/", "/api/admin/staff/lawyers/", "/api/cases/", f"/api/cases/{m}/",
                f"/api/cases/{m}/deadlines/", f"/api/cases/{m}/filings/", "/api/events/", "/api/finance/invoices/",
                "/api/finance/accounts/", "/api/audit-logs/", "/api/courtroom/sessions/", "/api/subscription/",
            ],
            self.advocate_user: [
                "/api/staff/lawyer/cases/", f"/api/staff/lawyer/cases/{m}/", "/api/staff/lawyer/documents/",
                "/api/staff/lawyer/notifications/", "/api/staff/lawyer/profile/", "/api/staff/lawyer/calendar/",
            ],
            self.secretary_user: [
                "/api/staff/secretary/cases/", "/api/staff/secretary/clients/", "/api/staff/secretary/documents/",
                "/api/staff/secretary/calendar/", "/api/staff/secretary/profile/",
            ],
            self.accountant_user: [
                "/api/staff/accountant/billing/", "/api/staff/accountant/documents/", "/api/staff/accountant/calendar/",
                "/api/finance/invoices/", "/api/finance/client-money/payments/",
            ],
            hr_user: ["/api/staff/hr/dashboard/", "/api/staff/hr/tasks/", "/api/staff/hr/documents/", "/api/staff/hr/calendar/"],
            it_user: ["/api/staff/it/dashboard/", "/api/staff/it/tasks/", "/api/staff/it/systems/"],
            client_user: [
                "/api/client/cases/", f"/api/client/cases/{m}/", "/api/client/documents/", "/api/client/profile/",
                "/api/notifications/",
            ],
        }
        for user, urls in pages.items():
            for url in urls:
                self.fetch(user, url)

        # Advocate: the task and the demand-period deadline, each linked to the matter.
        tasks = self.fetch(self.advocate_user, "/api/staff/lawyer/tasks/")["tasks"]
        self.assertEqual({item["kind"] for item in tasks}, {"TASK", "DEADLINE"})
        self.assertTrue(all(item["case_number"] == matter.case_number for item in tasks))
        dashboard = self.fetch(self.advocate_user, "/api/staff/lawyer/dashboard/")
        self.assertEqual(dashboard["summary"]["tasks_due"], len(tasks))
        self.assertIsNotNone(dashboard["upcoming"]["next_deadline"])
        self.assertEqual(self.fetch(self.advocate_user, "/api/staff/lawyer/approvals/")["approvals"], [])
        clients = self.fetch(self.advocate_user, "/api/staff/lawyer/clients/")["clients"]
        self.assertEqual([item["full_name"] for item in clients], ["Kamau Hardware Limited"])

        # Secretary: sees the deadline on the matter they support, without a separate task-management grant.
        secretary_tasks = self.fetch(self.secretary_user, "/api/staff/secretary/tasks/")["tasks"]
        self.assertIn("DEADLINE", {item["kind"] for item in secretary_tasks})
        self.assertEqual(self.fetch(self.secretary_user, "/api/staff/secretary/dashboard/")["summary"]["pending_tasks"], len(secretary_tasks))

        # Accountant: matter and client pickers, and the retainer still held for the client.
        registers = self.fetch(self.accountant_user, "/api/finance/registers/")
        self.assertEqual([item["case_number"] for item in registers["matters"]], [matter.case_number])
        self.assertEqual(registers["matters"][0]["client_name"], "Kamau Hardware Limited")
        self.assertEqual(self.fetch(self.accountant_user, "/api/staff/accountant/tasks/")["tasks"], [])

        # HR sees the real staff list.
        records = self.fetch(hr_user, "/api/staff/hr/staff-records/")["staff_records"]
        self.assertIn("Brian Otieno", {item["title"] for item in records})

        # Managing partner: reports and the firm-wide document register.
        report = self.fetch(self.partner, "/api/admin/reports/")
        self.assertEqual(report["matters"]["active"], 1)
        self.assertEqual(report["finance"]["client_money_held"], "50000.00")
        register = self.fetch(self.partner, "/api/admin/documents/")
        self.assertGreaterEqual(register["totals"]["documents"], 1)

        # Client: onboarding completed, money held, and the demand deadline is not the client's.
        status = self.fetch(client_user, "/api/client/onboarding-status/")
        steps = status["instructions"][0]["steps"]
        self.assertTrue(all(step["state"] == "completed" for step in steps), steps)
        self.assertEqual(status["instructions"][0]["matter"]["case_number"], matter.case_number)
        finance = self.fetch(client_user, "/api/client/finance/")
        self.assertEqual(finance["client_account"][0]["balance"], "50000.00")
        self.assertEqual(finance["invoices"], [])
