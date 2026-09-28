"""Create a practice firm for walking through docs/END_TO_END_WALKTHROUGH.md by hand.

Only runs against a database whose name ends in ``_practice``, so practice users
can never be added to a real firm's database.

    DB_NAME=lawfirm_practice venv/bin/python manage.py migrate
    DB_NAME=lawfirm_practice venv/bin/python manage.py seed_practice_firm
"""

from datetime import date
from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.billing.models import FinancialAccount, TaxConfiguration
from apps.clients.models import IntakePrivacyConfig
from apps.common.choices import FirmRole, UserRole
from apps.firm.models import FirmSetting, LawFirm, LawFirmMember
from apps.staff.models import (
    Accountant, AccountantPermission, AccountantPermissionGrant, Lawyer, LawyerPermission,
    LawyerPermissionGrant, Secretary, SecretaryPermission, SecretaryPermissionGrant,
)
from apps.users.models import User

PASSWORD = "Practice-2026!"

STAFF = {
    "partner": ("partner@mwangi.test", "Grace", "Mwangi", "+254711000001", UserRole.ADMIN),
    "advocate": ("otieno@mwangi.test", "Brian", "Otieno", "+254711000002", UserRole.STAFF),
    "secretary": ("wanjiku@mwangi.test", "Mary", "Wanjiku", "+254711000003", UserRole.STAFF),
    "accountant": ("njeri@mwangi.test", "Ann", "Njeri", "+254711000004", UserRole.STAFF),
}

ADVOCATE_GRANTS = [
    LawyerPermission.CREATE_PROPOSED_MATTER, LawyerPermission.PERFORM_CONFLICT_CHECK,
    LawyerPermission.APPROVE_CONFLICT_RESULT, LawyerPermission.ACCEPT_DECLINE_INSTRUCTIONS,
    LawyerPermission.CONFIRM_JURISDICTION, LawyerPermission.REVIEW_CLIENT_COMPLIANCE,
    LawyerPermission.OPEN_MATTER, LawyerPermission.CREATE_CASES, LawyerPermission.RECORD_COURT_FILING,
    LawyerPermission.MANAGE_ASSIGNED_CASES, LawyerPermission.MANAGE_CASE_DOCUMENTS,
    LawyerPermission.SCHEDULE_HEARINGS, LawyerPermission.COMPLETE_LEGAL_ASSESSMENT,
    LawyerPermission.REQUEST_MATTER_CLOSURE, LawyerPermission.USE_AI_TOOLS,
]


class Command(BaseCommand):
    help = "Create the Mwangi & Co. practice firm with a partner, advocate, secretary and accountant."

    def handle(self, *args, **options):
        database = settings.DATABASES["default"]["NAME"]
        if not str(database).endswith("_practice"):
            raise CommandError(f"Refusing to seed '{database}'. Point DB_NAME at a database ending in _practice.")
        if LawFirm.objects.filter(name="Mwangi & Co. Advocates").exists():
            raise CommandError("The practice firm already exists. Drop and recreate the practice database to start again.")
        with transaction.atomic():
            self.seed()
        self.stdout.write(self.style.SUCCESS(f"Practice firm ready in '{database}'. Every staff password: {PASSWORD}"))
        for key, (email, first, last, *_rest) in STAFF.items():
            self.stdout.write(f"  {key:<11} {email:<24} {first} {last}")

    def user(self, key):
        email, first, last, phone, role = STAFF[key]
        return User.objects.create_user(
            email=email, password=PASSWORD, first_name=first, last_name=last,
            phone_number=phone, national_id_number=phone[-9:], role=role,
        )

    def seed(self):
        partner = self.user("partner")
        firm = LawFirm.objects.create(
            owner=partner, name="Mwangi & Co. Advocates", registration_number="LSK-FIRM-0001",
            email="office@mwangi.test", phone_number="+254711000000",
            physical_address="Upper Hill, Nairobi", description="Commercial litigation and debt recovery.",
        )
        FirmSetting.objects.get_or_create(firm=firm)
        LawFirmMember.objects.create(firm=firm, user=partner, role=FirmRole.LAWYER, created_by=partner)
        partner_lawyer = Lawyer.objects.create(
            user=partner, law_firm=firm, staff_number="MP-001", job_title="Managing Partner",
            admission_number="P.105/1111/05", date_hired=date(2015, 1, 5),
        )
        for code, _label in LawyerPermission.choices:
            LawyerPermissionGrant.objects.create(lawyer=partner_lawyer, code=code, granted_by=partner)

        advocate_user = self.user("advocate")
        LawFirmMember.objects.create(firm=firm, user=advocate_user, role=FirmRole.LAWYER, created_by=partner)
        advocate = Lawyer.objects.create(
            user=advocate_user, law_firm=firm, staff_number="ADV-002", job_title="Associate",
            admission_number="P.105/2222/18", date_hired=date(2020, 3, 1),
        )
        for code in ADVOCATE_GRANTS:
            LawyerPermissionGrant.objects.create(lawyer=advocate, code=code, granted_by=partner)

        secretary_user = self.user("secretary")
        LawFirmMember.objects.create(firm=firm, user=secretary_user, role=FirmRole.SECRETARY, created_by=partner)
        secretary = Secretary.objects.create(user=secretary_user, law_firm=firm, staff_number="SEC-003", date_hired=date(2021, 6, 1))
        secretary.assigned_lawyers.add(advocate)
        for code in [SecretaryPermission.MANAGE_CLIENTS, SecretaryPermission.MANAGE_DOCUMENTS,
                     SecretaryPermission.MANAGE_CALENDAR, SecretaryPermission.SEND_COMMUNICATIONS]:
            SecretaryPermissionGrant.objects.create(secretary=secretary, code=code, granted_by=partner)

        accountant_user = self.user("accountant")
        LawFirmMember.objects.create(firm=firm, user=accountant_user, role=FirmRole.ACCOUNTANT, created_by=partner)
        accountant = Accountant.objects.create(user=accountant_user, law_firm=firm, staff_number="ACC-004", date_hired=date(2022, 1, 10))
        for code in [AccountantPermission.RECORD_RECEIPTS, AccountantPermission.MANAGE_CLIENT_MONEY, AccountantPermission.MANAGE_INVOICES]:
            AccountantPermissionGrant.objects.create(accountant=accountant, code=code, granted_by=partner)

        FinancialAccount.objects.create(
            firm=firm, name="Client account", account_type=FinancialAccount.AccountType.CLIENT,
            bank_name="KCB Bank Kenya", account_reference="1100223344",
        )
        FinancialAccount.objects.create(
            firm=firm, name="Office account", account_type=FinancialAccount.AccountType.OFFICE,
            bank_name="KCB Bank Kenya", account_reference="1100556677",
        )
        TaxConfiguration.objects.create(
            firm=firm, effective_from=date(2026, 1, 1), vat_registered=True,
            vat_registration_number="P051111111A", vat_rate=Decimal("16.000"),
        )
        IntakePrivacyConfig.objects.create(
            firm=firm, policy_version="2026.1", lawful_basis="LEGITIMATE_INTERESTS",
            notice_text="We process your personal data to assess and act on your instructions, as required by the Data Protection Act, 2019.",
            status="ACTIVE", approved_by=partner, approved_at=timezone.now(), activated_by=partner, activated_at=timezone.now(),
        )
