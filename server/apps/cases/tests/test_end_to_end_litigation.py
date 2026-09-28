"""One civil debt-recovery matter driven through the API, walk-in to archive.

Each step is performed by the firm role that performs it in a Kenyan practice:
the secretary receives the walk-in, the advocate screens conflicts and runs the
matter, the managing partner approves what needs a second person, and the
client acts only through their portal. Court filing, service and hearings
happen outside the system; the system records the facts and references.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.cases.models import Case, CaseEvent
from apps.clients.models import Client, ClientMatterConflictCheck, IntakePrivacyConfig
from apps.common.choices import ConflictCheckSourceCategory, ConflictCheckStatus, UserRole
from apps.firm.models import LawFirm
from apps.billing.models import FinancialAccount, TaxConfiguration
from apps.staff.models import (
    Accountant, AccountantPermission, AccountantPermissionGrant, Lawyer, LawyerPermission,
    LawyerPermissionGrant, Secretary, SecretaryPermission, SecretaryPermissionGrant,
)
from apps.users.models import User


def make_user(email, role, first, last, phone):
    return User.objects.create_user(
        email=email, password="Strong-pass-123", first_name=first, last_name=last,
        phone_number=phone, national_id_number=phone[-9:], role=role,
    )


class EndToEndLitigationTests(TestCase):
    ADVOCATE_GRANTS = [
        LawyerPermission.CREATE_PROPOSED_MATTER, LawyerPermission.PERFORM_CONFLICT_CHECK,
        LawyerPermission.APPROVE_CONFLICT_RESULT, LawyerPermission.ACCEPT_DECLINE_INSTRUCTIONS,
        LawyerPermission.CONFIRM_JURISDICTION, LawyerPermission.REVIEW_CLIENT_COMPLIANCE,
        LawyerPermission.OPEN_MATTER, LawyerPermission.CREATE_CASES, LawyerPermission.RECORD_COURT_FILING,
        LawyerPermission.MANAGE_ASSIGNED_CASES, LawyerPermission.MANAGE_CASE_DOCUMENTS,
        LawyerPermission.SCHEDULE_HEARINGS, LawyerPermission.COMPLETE_LEGAL_ASSESSMENT,
        LawyerPermission.REQUEST_MATTER_CLOSURE,
    ]

    def setUp(self):
        self.partner = make_user("partner@mwangi-advocates.test", UserRole.ADMIN, "Grace", "Mwangi", "+254711000001")
        self.firm = LawFirm.objects.create(name="Mwangi & Co. Advocates", registration_number="LSK-FIRM-0001", owner=self.partner)
        self.partner_lawyer = Lawyer.objects.create(
            user=self.partner, law_firm=self.firm, staff_number="MP-001",
            admission_number="P.105/1111/05", date_hired=date(2015, 1, 5),
        )
        self.advocate_user = make_user("otieno@mwangi-advocates.test", UserRole.STAFF, "Brian", "Otieno", "+254711000002")
        self.advocate = Lawyer.objects.create(
            user=self.advocate_user, law_firm=self.firm, staff_number="ADV-002",
            admission_number="P.105/2222/18", date_hired=date(2020, 3, 1),
        )
        for code in self.ADVOCATE_GRANTS:
            LawyerPermissionGrant.objects.create(lawyer=self.advocate, code=code, granted_by=self.partner)
        self.secretary_user = make_user("wanjiku@mwangi-advocates.test", UserRole.STAFF, "Mary", "Wanjiku", "+254711000003")
        self.secretary = Secretary.objects.create(
            user=self.secretary_user, law_firm=self.firm, staff_number="SEC-003", date_hired=date(2021, 6, 1),
        )
        self.secretary.assigned_lawyers.add(self.advocate)
        for code in [SecretaryPermission.MANAGE_CLIENTS, SecretaryPermission.MANAGE_DOCUMENTS, SecretaryPermission.MANAGE_CALENDAR, SecretaryPermission.SEND_COMMUNICATIONS]:
            SecretaryPermissionGrant.objects.create(secretary=self.secretary, code=code, granted_by=self.partner)
        self.accountant_user = make_user("njeri@mwangi-advocates.test", UserRole.STAFF, "Ann", "Njeri", "+254711000004")
        self.accountant = Accountant.objects.create(
            user=self.accountant_user, law_firm=self.firm, staff_number="ACC-004", date_hired=date(2022, 1, 10),
        )
        for code in [AccountantPermission.RECORD_RECEIPTS, AccountantPermission.MANAGE_CLIENT_MONEY, AccountantPermission.MANAGE_INVOICES]:
            AccountantPermissionGrant.objects.create(accountant=self.accountant, code=code, granted_by=self.partner)
        self.client_account = FinancialAccount.objects.create(
            firm=self.firm, name="Client account", account_type=FinancialAccount.AccountType.CLIENT,
            bank_name="KCB Bank Kenya", account_reference="1100223344",
        )
        self.office_account = FinancialAccount.objects.create(
            firm=self.firm, name="Office account", account_type=FinancialAccount.AccountType.OFFICE,
            bank_name="KCB Bank Kenya", account_reference="1100556677",
        )
        TaxConfiguration.objects.create(
            firm=self.firm, effective_from=date(2026, 1, 1), vat_registered=True,
            vat_registration_number="P051111111A", vat_rate=Decimal("16.000"),
        )
        IntakePrivacyConfig.objects.create(
            firm=self.firm, policy_version="2026.1", lawful_basis="LEGITIMATE_INTERESTS",
            notice_text="Approved privacy notice under the Data Protection Act, 2019.", status="ACTIVE",
            approved_by=self.partner, approved_at=timezone.now(), activated_by=self.partner, activated_at=timezone.now(),
        )
        self.api = APIClient()

    # ------------------------------------------------------------------ helpers
    def as_user(self, user):
        self.api.force_authenticate(user=user)
        return self.api

    def ok(self, response, status=200):
        self.assertEqual(response.status_code, status, getattr(response, "data", response.content))
        return response.data

    # ------------------------------------------------------------------ steps
    def step_reception_records_walk_in(self):
        data = self.ok(self.as_user(self.secretary_user).post("/api/staff/secretary/clients/prospective/", {
            "full_name": "Kamau Hardware Limited", "client_type": "COMPANY", "access_type": "PORTAL_ENABLED",
            "email": "accounts@kamauhardware.test", "phone_number": "+254722000100",
            "privacy": {"privacy_notice_delivered": True, "delivery_method": "PAPER"},
            "legal_profile": self.company_profile(),
            "representative": {
                "full_legal_name": "Peter Kamau", "representative_category": self.company_representative_category(),
                "role_title": "Director", "email": "peter@kamauhardware.test", "telephone": "+254722000101",
                "is_portal_contact": True,
            },
        }, format="json"), 201)
        client = Client.objects.get(pk=data["client"]["id"])
        self.assertEqual(client.lifecycle_status, Client.LifecycleStatus.PROSPECTIVE)
        self.assertFalse(client.cases.exists())
        return client

    def company_profile(self):
        from apps.clients.prospective_metadata import PROSPECTIVE_PROFILES
        profile = {}
        for field in PROSPECTIVE_PROFILES["COMPANY"]["fields"]:
            if field["required"]:
                profile[field["key"]] = field["options"][0]["value"] if field.get("options") else "Kamau Hardware Limited"
        return profile

    def company_representative_category(self):
        from apps.clients.prospective_metadata import REPRESENTATIVE_TYPES
        return REPRESENTATIVE_TYPES["COMPANY"][0]

    def step_advocate_records_proposed_matter(self, client):
        data = self.ok(self.as_user(self.advocate_user).post(f"/api/staff/lawyer/clients/{client.id}/conflict-checks/", {
            "proposed_matter_title": "Recovery of unpaid invoices from Baraka Builders Ltd",
            "proposed_instructions": "Recover KES 1,850,000 for hardware supplied on credit.",
            "responsible_lawyer_id": str(self.advocate.id),
            "parties": [{"name": "Baraka Builders Limited", "party_type": "ORGANISATION", "role": "PROPOSED_ADVERSE_PARTY"}],
        }, format="json"), 201)
        check = ClientMatterConflictCheck.objects.get(id=data["conflict_check"]["id"])
        self.assertEqual(check.status, ConflictCheckStatus.NOT_STARTED)
        return check

    def step_advocate_clears_conflict_and_accepts(self, client, check):
        base = f"/api/staff/lawyer/clients/{client.id}/conflict-checks/{check.id}"
        api = self.as_user(self.advocate_user)
        self.ok(api.post(f"{base}/start/", {}, format="json"))
        self.ok(api.post(f"{base}/decide/", {
            "decision": ConflictCheckStatus.CLEARED,
            "names_checked": ["Kamau Hardware Limited", "Peter Kamau", "Baraka Builders Limited"],
            "source_categories_checked": [choice for choice, _ in ConflictCheckSourceCategory.choices],
            "result_summary": "No relevant conflict identified for the proposed instructions based on the information and records checked.",
            "decision_confirmation": True,
        }, format="json"))
        self.ok(api.post(f"{base}/acceptance/", {
            "decision": ClientMatterConflictCheck.AcceptanceDecision.ACCEPTED,
            "scope_confirmation": "Pre-action demand and, if unpaid, a civil suit in the Magistrates' Court.",
            "engagement_status": ClientMatterConflictCheck.EngagementStatus.SIGNED,
        }, format="json"))
        check.refresh_from_db()
        self.assertEqual(check.status, ConflictCheckStatus.CLEARED)
        self.assertEqual(check.acceptance_decision, ClientMatterConflictCheck.AcceptanceDecision.ACCEPTED)
        return check

    def register_physical(self, client, subtype, title, **extra):
        payload = {
            "action": "register_physical", "client_id": str(client.id), "subtype": subtype, "title": title,
            "automatic_reference": True, "source_copy_type": "CERTIFIED_COPY", "category": extra.pop("category", "ENTITY_RECORD"),
            "verification_status": "VERIFIED", "verification_method": "Original sighted and certified copy retained.",
            "received_from_contact": f"REP:{client.representatives.get().pk}",
            **extra,
        }
        return self.ok(self.as_user(self.secretary_user).post("/api/staff/secretary/documents/", payload, format="json"), 201)["document"]

    def step_secretary_opens_physical_kyc_file(self, client):
        """KYC originals stay in the drawer; the system records references to them."""
        self.ok(self.as_user(self.secretary_user).post("/api/staff/secretary/documents/", {
            "action": "assign_drawer", "client_id": str(client.id),
            "kyc_drawer_reference": "KYC-2026-001", "cabinet_location": "Registry cabinet A, drawer 1",
        }, format="json"))
        documents = {
            "incorporation": self.register_physical(client, "INCORPORATION", "Certificate of Incorporation", document_identifier="PVT-AB12CD3"),
            "cr12": self.register_physical(client, "CR12", "CR12 from the Business Registration Service"),
            "kra_pin": self.register_physical(client, "KRA_PIN", "KRA PIN certificate", category="KYC_TAX", document_identifier="P051234567X"),
            "resolution": self.register_physical(client, "AUTHORITY_TO_INSTRUCT", "Board resolution authorising the claim"),
        }
        client.refresh_from_db()
        self.assertEqual(client.kyc_drawer_reference, "KYC-2026-001")
        self.assertTrue(all(item["reference"].startswith("KYC-2026-001/D") for item in documents.values()))
        self.assertFalse(any(item["digital_copy_available"] for item in documents.values()))
        return documents

    def step_advocate_completes_due_diligence(self, client):
        self.ok(self.as_user(self.advocate_user).put(f"/api/admin/clients/{client.id}/compliance-review/", {
            "identity_status": "VERIFIED", "authority_status": "VERIFIED", "beneficial_ownership_status": "VERIFIED",
            "due_diligence_status": "CLEARED", "source_of_funds_required": False, "source_of_funds_status": "NOT_APPLICABLE",
            "reason": "CR12, incorporation certificate, KRA PIN and board resolution sighted in the KYC drawer.",
        }, format="json"))

    def step_advocate_confirms_jurisdiction(self, client, check):
        base = f"/api/staff/lawyer/clients/{client.id}/conflict-checks/{check.id}/jurisdiction"
        api = self.as_user(self.advocate_user)
        suggestion = self.ok(api.post(f"{base}/", {
            "dispute_category": "DEBT_RECOVERY", "practice_area": "DEBT_RECOVERY", "claim_value": "1850000.00",
            "cause_of_action_location": "Nairobi", "defendant_location": "Nairobi",
            "relief_sought": "Payment of KES 1,850,000 for goods sold and delivered, interest and costs.",
        }, format="json"))["jurisdiction"]
        self.assertEqual(suggestion["suggestion"]["court_type"], "MAGISTRATE")
        self.ok(api.post(f"{base}/decision/", {
            "action": "ACCEPT",
            "subject_matter_basis": "Liquidated claim for goods sold and delivered.",
            "pecuniary_basis": "KES 1,850,000 is within the pecuniary limits of the Magistrates' Courts Act, 2015 and above the Small Claims Court limit.",
            "territorial_basis": "The defendant resides and the cause of action arose in Nairobi (section 15, Civil Procedure Act).",
            "legal_basis": "Section 7, Magistrates' Courts Act, 2015.",
            "advocate_findings": "Milimani Chief Magistrate's Court (Commercial Division).",
        }, format="json"))
        self.ok(api.post(f"{base}/confirm/", {}, format="json"))

    def step_engagement_signed_and_approved(self, client, check):
        letter = self.register_physical(client, "ENGAGEMENT_LETTER", "Signed letter of engagement", category="OTHER")
        base = f"/api/admin/clients/{client.id}/conflict-checks/{check.id}/engagements"
        engagement = self.ok(self.as_user(self.advocate_user).post(f"{base}/", {
            "responsible_advocate": str(self.advocate.id),
            "scope_of_work": "Demand letter; if unpaid, suit in the Magistrates' Court up to judgment and execution.",
            "excluded_work": "Appeals, unless separately instructed.",
            "fee_arrangement_type": "FIXED",
            "fee_arrangement_description": "Fixed instruction fee, not below the Advocates (Remuneration) Order scale.",
            "estimated_professional_fees": "150000.00", "estimated_disbursements": "25000.00",
            "required_retainer": "50000.00",
            "engagement_letter_document": letter["id"], "signed_at": timezone.now().isoformat(),
            "signed_by": "Peter Kamau, Director", "status": "SIGNED",
        }, format="json"), 201)["engagement"]
        approve = f"{base}/{engagement['id']}/approve/"
        refused = self.as_user(self.partner).post(approve, {}, format="json")
        self.assertEqual(refused.status_code, 400, refused.data)
        self.assertIn("retainer", str(refused.data))

        self.ok(self.as_user(self.accountant_user).post("/api/finance/client-money/retainers/", {
            "client": str(client.id), "proposed_matter": str(check.id), "engagement": engagement["id"],
            "account": str(self.client_account.id), "receipt_number": "RCT-2026-0001",
            "amount_received": "50000.00", "payment_date": date.today().isoformat(),
            "payment_method": "MOBILE_MONEY", "bank_transaction_reference": "SGH7K2L9QX",
        }, format="json"), 201)
        self.ok(self.as_user(self.partner).post(approve, {}, format="json"))
        return engagement

    def step_client_invited_to_portal(self, client):
        from django.core import mail
        from urllib.parse import parse_qs, urlparse

        self.ok(self.as_user(self.secretary_user).post(f"/api/staff/secretary/clients/{client.id}/portal-invitation/", {}, format="json"))
        client.refresh_from_db()
        self.assertEqual(client.portal_status, "INVITED")
        invitation = mail.outbox[-1]
        self.assertIn("peter@kamauhardware.test", invitation.to)
        self.assertEqual(invitation.subject, "Mwangi & Co. Advocates has invited you to your client portal")
        link = next(line for line in invitation.body.splitlines() if "uid=" in line)
        params = parse_qs(urlparse(link.strip()).query)
        self.api.force_authenticate(user=None)
        self.ok(self.api.post("/api/auth/reset-password/", {
            "uid": params["uid"][0], "token": params["token"][0],
            "new_password": "Kamau-Portal-2026!", "confirm_password": "Kamau-Portal-2026!",
        }, format="json"))
        client.user.refresh_from_db()
        self.assertTrue(client.user.check_password("Kamau-Portal-2026!"))
        return client.user

    def step_advocate_opens_matter(self, client, check):
        data = self.ok(self.as_user(self.advocate_user).post("/api/cases/", {
            "client_id": str(client.id), "conflict_check_id": str(check.id),
            "assigned_lawyer_membership_id": str(self.advocate.id),
            "assigned_secretary_membership_id": str(self.secretary.id),
            "entry_route": Case.EntryRoute.NEW_INSTRUCTION,
            "title": "Kamau Hardware Limited v Baraka Builders Limited",
            "description": "Recovery of KES 1,850,000 for goods sold and delivered.",
            "case_type": Case.CaseType.DEBT_RECOVERY,
            "procedure_type": Case.ProcedureTrack.CIVIL_SUIT, "procedure_track": Case.ProcedureTrack.CIVIL_SUIT,
            "priority": Case.Priority.MEDIUM, "client_party_role": "PLAINTIFF",
            "practice_area": Case.PracticeArea.CIVIL_COMMERCIAL_LITIGATION,
            "matter_nature": Case.MatterNature.CONTENTIOUS, "forum": Case.Forum.COURT,
            "court_type": Case.CourtType.MAGISTRATE, "court_station": "Milimani Commercial Courts",
            "defendant": "Baraka Builders Limited",
        }, format="json"), 201)
        matter = Case.objects.get(id=data["data"]["id"])
        client.refresh_from_db()
        self.assertEqual(matter.matter_status, Case.MatterStatus.MATTER_OPEN)
        self.assertEqual(matter.court_stage, Case.CourtStage.NOT_FILED)
        self.assertEqual(matter.assigned_lawyer, self.advocate)
        self.assertEqual(matter.client_ledger.cleared_balance, Decimal("50000.00"))
        return matter

    def transition(self, user, matter, to_state, reason, metadata=None, dimension="COURT_STAGE"):
        return self.ok(self.as_user(user).post(f"/api/cases/{matter.id}/transitions/", {
            "dimension": dimension, "to_state": to_state, "reason": reason, "metadata": metadata or {},
        }, format="json"), 201 if False else 200)

    def step_secretary_prepares_physical_file(self, matter):
        self.ok(self.as_user(self.secretary_user).get(f"/api/cases/{matter.id}/physical-file/"))
        data = self.ok(self.as_user(self.secretary_user).post(f"/api/cases/{matter.id}/physical-file/", {
            "operation": "assign", "storage_zone": "Litigation registry", "cabinet": "Cabinet L2", "shelf_or_drawer": "Shelf 3",
        }, format="json"))
        self.assertEqual(data["physical_file"]["status"], "ACTIVE")

    def register(self, user, matter, filing_type, status=201, **fields):
        return self.ok(self.as_user(user).post(f"/api/cases/{matter.id}/filings/", {"filing_type": filing_type, **fields}, format="json"), status)

    def step_demand_letter_issued(self, matter):
        matter.refresh_from_db()
        self.assertEqual(matter.next_action, "Issue demand letter")
        # The office copy goes into the physical matter file; the register records the issue date and period.
        self.ok(self.as_user(self.advocate_user).post("/api/staff/lawyer/documents/", {
            "action": "matter_document", "case_id": str(matter.id), "title": "Demand letter to Baraka Builders Limited",
            "attachment_type": "CORRESPONDENCE", "physical_section": "CORRESPONDENCE",
            "document_date": (date.today() - timedelta(days=16)).isoformat(), "origin": "FIRM_GENERATED",
        }, format="json"), 201)
        issued = timezone.now() - timedelta(days=16)
        data = self.register(self.advocate_user, matter, "DEMAND_LETTER", title="Demand letter to Baraka Builders Limited",
                             filed_at=issued.isoformat(), response_period_days=14)
        self.assertEqual(data["filing"]["response_due_date"], (timezone.localdate(issued) + timedelta(days=14)).isoformat())
        # The 14-day period has lapsed without payment, so the plaint is now the recommended step.
        self.assertEqual(data["next_action"], "Filing")
        self.assertTrue(matter.deadlines.filter(description__startswith="Demand period expires").exists())

    def step_plaint_filed(self, matter):
        self.transition(self.advocate_user, matter, "READY_FOR_FILING", "Demand period expired without payment; plaint drafted and approved.")
        self.transition(self.advocate_user, matter, "FILED", "Plaint filed through the Judiciary e-filing portal.", {
            "filing_date": date.today().isoformat(), "official_court_case_number": "MCCOMMSU/E1234/2026",
            "efiling_reference": "EF-2026-778812", "court_station": "Milimani Commercial Courts",
            "registry": "Milimani Chief Magistrate's Court registry", "court_fee_amount": "20450.00",
            "payment_reference": "MPESA-SGK88QP1", "payment_date": date.today().isoformat(),
        })
        matter.refresh_from_db()
        self.assertEqual(matter.court_stage, Case.CourtStage.FILED)
        self.assertEqual(matter.official_court_case_number, "MCCOMMSU/E1234/2026")
        self.assertTrue(matter.filings.filter(official_court_case_number="MCCOMMSU/E1234/2026").exists())

    def step_summons_served_and_pleadings_close(self, matter):
        """Order 5 service, then appearance and defence within the rule periods."""
        self.transition(self.advocate_user, matter, "AWAITING_SERVICE", "Summons issued by the registry for service.")
        self.transition(self.advocate_user, matter, "SERVICE_IN_PROGRESS", "Summons and plaint released to the process server.")
        matter.refresh_from_db()
        self.assertEqual(matter.next_action, "Serve summons and plaint")

        served = timezone.now() - timedelta(days=3)
        self.register(self.secretary_user, matter, "SUMMONS", served_at=served.isoformat(), title="Summons served on the defendant's director")
        self.register(self.secretary_user, matter, "AFFIDAVIT_OF_SERVICE", served_at=served.isoformat(), efiling_reference="EF-2026-779001")
        self.transition(self.advocate_user, matter, "AWAITING_RESPONSE", "Affidavit of service filed.", {"affidavit_of_service_filed": True})
        appearance_due = timezone.localdate(served) + timedelta(days=15)
        matter.refresh_from_db()
        self.assertEqual(matter.next_action, f"Entry of appearance due by {appearance_due:%d %b %Y}")
        self.assertEqual(matter.deadlines.filter(source=f"APPEARANCE:{matter.id}").count(), 1)

        appeared = timezone.now() - timedelta(days=1)
        self.register(self.secretary_user, matter, "MEMORANDUM_OF_APPEARANCE", filed_at=appeared.isoformat(), title="Memorandum of appearance by Baraka Builders Limited")
        matter.refresh_from_db()
        self.assertEqual(matter.next_action, f"Defence due by {timezone.localdate(appeared) + timedelta(days=14):%d %b %Y}")

        self.register(self.secretary_user, matter, "DEFENCE", title="Statement of defence")
        self.assertFalse(matter.deadlines.filter(status="OPEN", source__in=[f"APPEARANCE:{matter.id}", f"DEFENCE:{matter.id}"]).exists())
        self.transition(self.advocate_user, matter, "PLEADINGS_OPEN", "Defence served on the plaintiff.")
        self.register(self.advocate_user, matter, "REPLY_TO_DEFENCE", title="Reply to defence")
        self.transition(self.advocate_user, matter, "PLEADINGS_CLOSED", "Reply to defence filed; pleadings closed.")
        self.transition(self.advocate_user, matter, "CASE_MANAGEMENT", "Pre-trial directions sought under Order 11.")
        self.transition(self.advocate_user, matter, "PRE_TRIAL", "Parties complied with Order 11: witness statements and documents filed.")
        self.transition(self.advocate_user, matter, "AWAITING_HEARING", "Hearing date taken at the registry.")

    def step_virtual_hearing(self, matter, client_user):
        """The advocate pastes the Teams link; the client joins from the portal; the outcome is recorded."""
        event = self.ok(self.as_user(self.advocate_user).post(f"/api/cases/{matter.id}/events/", {
            "event_type": "HEARING", "title": "Hearing - Kamau Hardware v Baraka Builders",
            "starts_at": (timezone.now() + timedelta(minutes=10)).isoformat(),
            "court": "Chief Magistrate's Court", "court_station": "Milimani Commercial Courts",
            "hearing_mode": "VIRTUAL", "is_client_visible": True,
        }, format="json"), 201)["event"]
        session = self.ok(self.as_user(self.advocate_user).post("/api/courtroom/sessions/", {
            "event_id": event["id"], "join_url": "https://teams.microsoft.com/l/meetup-join/milimani-cm-court-3",
            "link_source": "CAUSE_LIST", "link_verified": True,
        }, format="json"), 201)
        from apps.notifications.models import Notification
        self.assertTrue(Notification.objects.filter(recipient=client_user, notification_type="COURTROOM_LINK").exists())

        sessions = self.ok(self.as_user(client_user).get("/api/courtroom/sessions/", {"case_id": str(matter.id)}))
        self.assertEqual(len(sessions), 1)
        self.assertTrue(sessions[0]["can_join"])
        grant = self.ok(self.api.post(f"/api/courtroom/sessions/{session['id']}/launch/"), 201)
        opened = self.ok(self.api.post(f"/api/courtroom/launch/{grant['launch_token']}/open/"))
        self.assertEqual(opened["open_url"], "https://teams.microsoft.com/l/meetup-join/milimani-cm-court-3")

        self.transition(self.advocate_user, matter, "HEARING_IN_PROGRESS", "Plaintiff's case opened; PW1 testified.")
        judgment_on = timezone.now() + timedelta(days=30)
        self.ok(self.as_user(self.advocate_user).post(f"/api/cases/{matter.id}/events/{event['id']}/record-outcome/", {
            "proceeded": True, "outcome_code": "PROCEEDED",
            "outcome": "Both sides closed their cases. Written submissions within 14 days; judgment reserved.",
            "orders_directions": "Plaintiff to file submissions in 7 days, defendant 7 days thereafter.",
            "next_event_type": "JUDGMENT", "next_date": judgment_on.isoformat(),
        }, format="json"))
        self.transition(self.advocate_user, matter, "SUBMISSIONS", "Directions on written submissions issued.")
        self.register(self.advocate_user, matter, "SUBMISSIONS", title="Plaintiff's written submissions")
        self.transition(self.advocate_user, matter, "JUDGMENT_RESERVED", "Submissions filed; judgment reserved.")
        return matter.events.get(event_type="JUDGMENT")

    def step_document_request_round_trip(self, matter, client_user):
        """Advocate asks; the client uploads from the portal; the secretary files the original; the advocate accepts."""
        from apps.documents.models import DocumentRequest
        from apps.notifications.models import Notification

        # Nothing is requested yet, so the client sees no upload option and the endpoint refuses uploads.
        workspace = self.ok(self.as_user(client_user).get("/api/client/documents/", {"case_id": str(matter.id)}))
        self.assertEqual(workspace["requests"], [])
        refused = self.api.post("/api/client/documents/", {"file": SimpleUploadedFile("x.pdf", b"%PDF-1.4")}, format="multipart")
        self.assertEqual(refused.status_code, 400)

        request = self.ok(self.as_user(self.advocate_user).post("/api/staff/lawyer/documents/", {
            "action": "request", "case_id": str(matter.id), "document_type": "EVIDENCE",
            "title": "Unpaid invoices and signed delivery notes",
            "instructions": "Scan all invoices from January to June 2026 with the delivery notes signed by Baraka's site manager.",
            "due_date": (date.today() + timedelta(days=5)).isoformat(),
        }, format="json"), 201)
        self.assertEqual(request["status"], "OPEN")
        self.assertTrue(Notification.objects.filter(recipient=client_user, title="Document requested").exists())

        workspace = self.ok(self.as_user(client_user).get("/api/client/documents/", {"case_id": str(matter.id)}))
        self.assertEqual([item["id"] for item in workspace["requests"]], [request["id"]])
        self.ok(self.api.post("/api/client/documents/", {
            "request_id": request["id"], "file": SimpleUploadedFile("invoices.pdf", b"%PDF-1.4 invoices", content_type="application/pdf"),
        }, format="multipart"), 201)
        item = DocumentRequest.objects.get(id=request["id"])
        self.assertEqual(item.status, DocumentRequest.Status.PENDING_SECRETARY)
        self.assertEqual(item.fulfilled_document.classification, "MATTER_SPECIFIC")

        # The client cannot upload twice while the secretary is checking.
        again = self.api.post("/api/client/documents/", {
            "request_id": request["id"], "file": SimpleUploadedFile("again.pdf", b"%PDF-1.4", content_type="application/pdf"),
        }, format="multipart")
        self.assertEqual(again.status_code, 400)

        self.ok(self.as_user(self.secretary_user).patch(f"/api/staff/secretary/documents/requests/{request['id']}/verify/", {
            "correct_client": True, "readable_complete": True, "matter_link_confirmed": True,
            "physical_copy_retained": True, "physical_storage_location": f"Matter file {matter.case_number} / Evidence",
        }, format="json"))
        returned = self.ok(self.as_user(self.advocate_user).patch(f"/api/staff/lawyer/documents/requests/{request['id']}/review/", {
            "decision": "REPLACEMENT_REQUIRED", "notes": "Delivery note for March is missing the site manager's signature.",
        }, format="json"))
        self.assertEqual(returned["status"], "REPLACEMENT_REQUIRED")
        self.assertTrue(Notification.objects.filter(recipient=client_user, title="Please upload a replacement document").exists())

        first_copy = item.fulfilled_document_id
        self.ok(self.as_user(client_user).post("/api/client/documents/", {
            "request_id": request["id"], "file": SimpleUploadedFile("invoices-v2.pdf", b"%PDF-1.4 signed", content_type="application/pdf"),
        }, format="multipart"), 201)
        item.refresh_from_db()
        self.assertNotEqual(item.fulfilled_document_id, first_copy)
        self.ok(self.as_user(self.secretary_user).patch(f"/api/staff/secretary/documents/requests/{request['id']}/verify/", {
            "correct_client": True, "readable_complete": True, "matter_link_confirmed": True,
            "physical_copy_retained": True, "physical_storage_location": f"Matter file {matter.case_number} / Evidence",
        }, format="json"))
        accepted = self.ok(self.as_user(self.advocate_user).patch(f"/api/staff/lawyer/documents/requests/{request['id']}/review/", {
            "decision": "ACCEPTED", "notes": "Complete and legible.",
        }, format="json"))
        self.assertEqual(accepted["status"], "ACCEPTED")

    def step_judgment_decree_and_enforcement(self, matter, judgment_event):
        self.ok(self.as_user(self.advocate_user).post(f"/api/cases/{matter.id}/events/{judgment_event.id}/record-outcome/", {
            "proceeded": True, "outcome_code": "JUDGMENT_DELIVERED",
            "outcome": "Judgment for the plaintiff for KES 1,850,000 with interest at court rates and costs.",
            "party_favoured": "Plaintiff",
        }, format="json"))
        self.transition(self.advocate_user, matter, "JUDGMENT_DELIVERED", "Judgment delivered for the plaintiff.")
        self.transition(self.advocate_user, matter, "WON", "Judgment for KES 1,850,000, interest and costs.", dimension="OUTCOME_STATUS")
        self.transition(self.advocate_user, matter, "DECREE_PENDING", "Draft decree sent to the defendant for approval.", dimension="ENFORCEMENT_STATUS")
        self.transition(self.advocate_user, matter, "DECREE_EXTRACTION", "Decree being extracted.")
        self.register(self.advocate_user, matter, "DECREE", title="Decree issued by the Deputy Registrar")
        self.transition(self.advocate_user, matter, "DECREE_ISSUED", "Decree signed and sealed.", dimension="ENFORCEMENT_STATUS")
        self.register(self.advocate_user, matter, "BILL_OF_COSTS", title="Plaintiff's bill of costs")
        self.register(self.advocate_user, matter, "CERTIFICATE_OF_COSTS", title="Certificate of costs after taxation")
        self.transition(self.advocate_user, matter, "DEMAND_FOR_COMPLIANCE", "Decree and certificate of costs served with a demand.", dimension="ENFORCEMENT_STATUS")
        self.transition(self.advocate_user, matter, "SATISFIED", "Defendant paid the decretal sum and costs into the client account.", dimension="ENFORCEMENT_STATUS")
        self.transition(self.advocate_user, matter, "CONCLUDED", "Decree satisfied without execution.")
        matter.refresh_from_db()
        self.assertEqual(matter.court_stage, Case.CourtStage.CONCLUDED)

    def step_money_accounted_for(self, matter, client):
        """Decretal sum into the client account, fees billed and transferred, balance paid out to the client."""
        accountant = self.as_user(self.accountant_user)
        self.ok(accountant.post("/api/finance/client-money/receipts/", {
            "matter": str(matter.id), "account": str(self.client_account.id), "receipt_number": "RCT-2026-0002",
            "amount_received": "2035000.00", "payment_date": date.today().isoformat(),
            "payment_method": "BANK_TRANSFER", "bank_transaction_reference": "RTGS-KCB-99812",
        }, format="json"), 201)

        invoice = self.ok(accountant.post("/api/finance/invoices/", {
            "client": str(client.id), "matter": str(matter.id), "invoice_number": "INV-2026-0001",
            "invoice_date": date.today().isoformat(), "due_date": (date.today() + timedelta(days=14)).isoformat(),
            "line_items": [
                {"line_type": "PROFESSIONAL_FEE", "description": "Instruction fee: suit to judgment and decree", "quantity": "1", "unit_price": "150000.00"},
                {"line_type": "DISBURSEMENT", "description": "Court filing fees paid on e-filing", "quantity": "1", "unit_price": "20450.00"},
            ],
        }, format="json"), 201)["invoice"]
        base = f"/api/finance/invoices/{invoice['id']}"
        self.ok(accountant.post(f"{base}/submit/", {}, format="json"))
        self.ok(self.as_user(self.partner).post(f"{base}/approve/", {}, format="json"))
        issued = self.ok(self.as_user(self.accountant_user).post(f"{base}/issue/", {}, format="json"))
        total = Decimal(str(issued["invoice"]["total_amount"]))
        self.assertEqual(total, Decimal("194450.00"))  # 150,000 fee + 16% VAT + 20,450 court fees

        # A withdrawal from client account is authorised by an advocate of the firm.
        self.ok(self.as_user(self.partner).post("/api/finance/client-money/transfers/", {
            "invoice": invoice["id"], "client_account": str(self.client_account.id), "office_account": str(self.office_account.id),
            "amount": str(total), "basis": "Issued fee note INV-2026-0001 settled from client funds with the client's written authority.",
        }, format="json"), 201)

        matter.client_ledger.refresh_from_db()
        balance = matter.client_ledger.cleared_balance
        self.assertEqual(balance, Decimal("2085000.00") - total)
        instruction = self.ok(self.as_user(self.accountant_user).post("/api/finance/client-money/payments/", {
            "matter": str(matter.id), "account": str(self.client_account.id), "beneficiary_name": "Kamau Hardware Limited",
            "beneficiary_details": {"bank": "Equity Bank", "account": "0170299887766"}, "amount": str(balance),
            "purpose": "Remit recovered decretal sum and costs, net of fees.", "payment_basis": "Final account approved by the client.",
        }, format="json"), 201)["payment_instruction"]
        self.ok(self.as_user(self.partner).post(f"/api/finance/client-money/payments/{instruction['id']}/approve/", {}, format="json"))
        matter.client_ledger.refresh_from_db()
        self.assertEqual(matter.client_ledger.cleared_balance, Decimal("0.00"))

    def step_matter_closed_and_archived(self, matter):
        closure = self.ok(self.as_user(self.advocate_user).post(f"/api/cases/{matter.id}/closure/", {
            "proposed_closure_date": date.today().isoformat(), "closure_reason": "Decree satisfied and funds remitted.",
            "outcome": "Judgment for the plaintiff; decree satisfied.", "closing_summary": "Recovered KES 2,035,000 including costs.",
            "appeal_position": "No appeal filed within 30 days.", "enforcement_position": "Decree satisfied without execution.",
            "legal_work_complete": True, "result_document_recorded": True, "client_instructions_complete": True,
            "undertakings_resolved": True, "final_invoice_issued": True, "final_client_account_prepared": True,
            "closing_letter_prepared": True, "client_informed": True,
            "original_document_status": "RETURNED", "financial_clearance_status": "PENDING_FINANCE",
        }, format="json"), 201)["closure"]
        base = f"/api/cases/{matter.id}/closure/{closure['id']}"
        partner = self.as_user(self.partner)
        self.ok(partner.post(f"{base}/approve-advocate/", {}, format="json"))
        self.ok(partner.post(f"{base}/approve-finance/", {}, format="json"))
        for document_type in ("CLOSING_LETTER", "FINAL_CLIENT_STATEMENT"):
            self.ok(partner.post(f"{base}/documents/", {"document_type": document_type}, format="json"), 201)
        self.ok(partner.post(f"{base}/finalise/", {}, format="json"))
        matter.refresh_from_db()
        self.assertEqual(matter.matter_status, Case.MatterStatus.CLOSED)

        archive = self.ok(partner.post(f"/api/cases/{matter.id}/archive/", {
            "archive_reference": "ARC-2026-0001", "closure_date": date.today().isoformat(), "archive_date": date.today().isoformat(),
            "electronic_location": f"archive/{matter.case_number}", "archive_category": "LITIGATION",
            "matter_type": "DEBT_RECOVERY", "retention_policy": "Seven years from closure",
            "retention_start_date": date.today().isoformat(),
            "scheduled_review_date": (date.today() + timedelta(days=365 * 7)).isoformat(),
            "responsible_custodian": str(self.partner.id), "archive_checklist": {"closing_letter": True, "originals_returned": True},
        }, format="json"), 201)
        matter.refresh_from_db()
        self.assertEqual(matter.matter_status, Case.MatterStatus.ARCHIVED)
        return archive

    # ------------------------------------------------------------------ the walk
    def test_walk_in_to_archive(self):
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
        self.step_plaint_filed(matter)
        self.step_summons_served_and_pleadings_close(matter)
        judgment_event = self.step_virtual_hearing(matter, client_user)
        self.step_judgment_decree_and_enforcement(matter, judgment_event)
        self.step_money_accounted_for(matter, client)
        self.step_matter_closed_and_archived(matter)
