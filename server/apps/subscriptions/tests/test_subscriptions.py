from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.clients.models import Client
from apps.common.choices import FirmRole, UserRole
from apps.firm.models import LawFirm, LawFirmMember
from apps.staff.models import Lawyer
from apps.staff.services.admin.lawyers.admin_lawyer_create_service import AdminLawyerCreateService
from apps.subscriptions.catalog import Feature, Limit
from apps.subscriptions.models import FirmSubscription, Plan, SubscriptionInvoice
from apps.subscriptions.services import PlanLimitReached, SubscriptionService, add_months
from apps.users.models import User


def make_user(email, role, phone):
    return User.objects.create_user(
        email=email, password="Strong-pass-123", first_name="Test", last_name="User",
        phone_number=phone, national_id_number=phone[-9:], role=role,
    )


class SubscriptionTestCase(TestCase):
    def setUp(self):
        self.owner = make_user("owner@saas.test", UserRole.ADMIN, "+254744000001")
        self.firm = LawFirm.objects.create(name="Otieno & Co. Advocates", registration_number="BN-SAAS-1", owner=self.owner)
        LawFirmMember.objects.create(firm=self.firm, user=self.owner, role=FirmRole.LAWYER, created_by=self.owner)
        Lawyer.objects.create(
            user=self.owner, law_firm=self.firm, staff_number="ADV-1",
            admission_number="P.105/1/10", date_hired=date(2010, 1, 1),
        )
        self.api = APIClient()

    def put_on(self, code, **fields):
        subscription = self.firm.subscription
        subscription.plan = Plan.objects.get(code=code)
        for name, value in fields.items():
            setattr(subscription, name, value)
        subscription.save()
        return subscription


class TrialAndCatalogueTests(SubscriptionTestCase):
    def test_new_firm_starts_a_14_day_trial_on_the_pro_plan(self):
        subscription = self.firm.subscription
        self.assertEqual(subscription.status, FirmSubscription.Status.TRIALING)
        self.assertEqual(subscription.plan.code, "PRO")
        self.assertAlmostEqual(
            (subscription.trial_ends_at - timezone.now()).total_seconds(), timedelta(days=14).total_seconds(), delta=60,
        )

    def test_public_plan_list_is_priced_in_kes_and_lists_statutory_features_for_every_plan(self):
        response = self.api.get("/api/subscription/plans/")
        self.assertEqual(response.status_code, 200)
        codes = [plan["code"] for plan in response.data["plans"]]
        self.assertEqual(codes, ["BASIC", "PRO"])
        prices = {plan["code"]: plan["monthly_price"] for plan in response.data["plans"]}
        self.assertEqual(prices, {"BASIC": "2500.00", "PRO": "5000.00"})
        self.assertTrue(any("Advocates (Accounts) Rules" in line for line in response.data["included_in_every_plan"]))

    def test_summary_reports_usage_against_limits(self):
        self.api.force_authenticate(self.owner)
        response = self.api.get("/api/subscription/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["usage"][Limit.ADVOCATES], 1)
        self.assertTrue(response.data["writable"])


@override_settings(ALLOW_PUBLIC_FIRM_SIGNUP=True)
class FirmSignupTests(TestCase):
    payload = {
        "firm": {
            "name": "Wanjiru Advocates", "registration_number": "BN-2026-0042",
            "email": "info@wanjiru.test", "kra_pin": "P051234567X",
        },
        "admin": {
            "first_name": "Jane", "last_name": "Wanjiru", "email": "jane@wanjiru.test",
            "phone_number": "+254711000111", "national_id_number": "30111222",
            "admission_number": "P.105/9876/18",
            "password": "Kenya-Law-2026!", "confirm_password": "Kenya-Law-2026!",
        },
        "plan_code": "BASIC",
    }

    def test_signup_creates_firm_managing_partner_and_trial_on_chosen_plan(self):
        response = APIClient().post("/api/auth/register-firm/", self.payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(response.data["access"])
        self.assertTrue(response.data["is_firm_owner"])

        firm = LawFirm.objects.get(name="Wanjiru Advocates")
        self.assertEqual(firm.owner.role, UserRole.ADMIN)
        self.assertEqual(firm.subscription.plan.code, "BASIC")
        self.assertEqual(firm.subscription.status, FirmSubscription.Status.TRIALING)
        lawyer = Lawyer.objects.get(user=firm.owner)
        self.assertEqual(lawyer.admission_number, "P.105/9876/18")
        self.assertTrue(firm.members.filter(user=firm.owner, is_active=True).exists())

    def test_signup_rejects_invalid_kra_pin_and_duplicate_firm(self):
        bad = {**self.payload, "firm": {**self.payload["firm"], "kra_pin": "12345"}}
        response = APIClient().post("/api/auth/register-firm/", bad, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("KRA PIN", response.data["message"])

        APIClient().post("/api/auth/register-firm/", self.payload, format="json")
        again = APIClient().post("/api/auth/register-firm/", self.payload, format="json")
        self.assertEqual(again.status_code, 400)


class LimitTests(SubscriptionTestCase):
    def add_advocates(self, count):
        for n in range(count):
            user = make_user(f"extra{n}@saas.test", UserRole.STAFF, f"+25474400030{n}")
            Lawyer.objects.create(
                user=user, law_firm=self.firm, staff_number=f"EXTRA-{n}",
                admission_number=f"P.105/{n}/22", date_hired=date(2022, 1, 1),
            )

    def test_basic_plan_refuses_a_fourth_advocate(self):
        self.put_on("BASIC")
        self.add_advocates(2)
        with self.assertRaises(PlanLimitReached):
            AdminLawyerCreateService.create_lawyer(
                law_firm=self.firm, created_by=self.owner,
                validated_data={
                    "email": "second@saas.test", "first_name": "Second", "last_name": "Advocate",
                    "phone_number": "+254744000002", "national_id_number": "44000002",
                    "admission_number": "P.105/2/20", "date_hired": date(2020, 1, 1),
                },
            )
        self.assertEqual(Lawyer.objects.filter(law_firm=self.firm).count(), 3)

    def test_reactivating_an_advocate_takes_a_seat(self):
        from apps.staff.services.admin.lawyers.admin_lawyer_status_service import AdminLawyerStatusService

        self.put_on("BASIC")
        self.add_advocates(2)
        spare = make_user("spare@saas.test", UserRole.STAFF, "+254744000003")
        inactive = Lawyer.objects.create(
            user=spare, law_firm=self.firm, staff_number="ADV-2", admission_number="P.105/3/20",
            date_hired=date(2020, 1, 1), is_active=False,
        )
        with self.assertRaises(PlanLimitReached):
            AdminLawyerStatusService.activate_lawyer(lawyer=inactive, updated_by=self.owner)

    def test_branch_limit_is_enforced_through_the_api(self):
        self.put_on("BASIC")
        self.api.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.owner).access_token}")
        first = self.api.post("/api/admin/firm/branches/", {"name": "Nairobi"}, format="json")
        self.assertEqual(first.status_code, 201, first.data)
        second = self.api.post("/api/admin/firm/branches/", {"name": "Mombasa"}, format="json")
        self.assertEqual(second.status_code, 403)
        self.assertEqual(second.data["code"], "plan_limit_reached")


class LapseAndFeatureTests(SubscriptionTestCase):
    def test_expired_trial_makes_the_firm_read_only_but_leaves_billing_open(self):
        self.put_on("PRO", trial_ends_at=timezone.now() - timedelta(days=1))
        self.api.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.owner).access_token}")

        self.assertEqual(self.api.get("/api/admin/firm/branches/").status_code, 200)
        blocked = self.api.post("/api/admin/firm/branches/", {"name": "Kisumu"}, format="json")
        self.assertEqual(blocked.status_code, 402)
        self.assertEqual(blocked.data["code"], "subscription_inactive")

        renew = self.api.post("/api/subscription/invoices/", {"plan_code": "BASIC", "billing_cycle": "MONTHLY"}, format="json")
        self.assertEqual(renew.status_code, 201, renew.data)

    def test_grace_period_keeps_the_firm_writable_for_seven_days(self):
        subscription = self.put_on(
            "PRO", status=FirmSubscription.Status.ACTIVE, trial_ends_at=None,
            current_period_end=timezone.now() - timedelta(days=3),
        )
        self.assertEqual(SubscriptionService.effective_status(subscription), "GRACE")
        self.assertTrue(SubscriptionService.is_writable(subscription))
        later = timezone.now() + timedelta(days=5)
        self.assertEqual(SubscriptionService.effective_status(subscription, later), "EXPIRED")

    def test_client_portal_is_refused_on_a_plan_without_it(self):
        client_user = make_user("client@saas.test", UserRole.OFFICIAL_CLIENT, "+254744000009")
        Client.objects.create(
            firm=self.firm, user=client_user, created_by=self.owner, full_name="Kamau Hardware Ltd",
            client_type=Client.ClientType.COMPANY, lifecycle_status=Client.LifecycleStatus.OFFICIAL_CLIENT,
        )
        Plan.objects.create(code="NO_PORTAL", name="No portal", monthly_price=1, annual_price=10, features=[])
        self.put_on("NO_PORTAL")
        self.assertFalse(SubscriptionService.has_feature(self.firm, Feature.CLIENT_PORTAL))

        token = RefreshToken.for_user(client_user).access_token
        self.api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.api.get("/api/client/dashboard/")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["code"], "plan_upgrade_required")

        self.put_on("BASIC")
        self.assertNotEqual(self.api.get("/api/client/dashboard/").status_code, 403)


class InvoiceAndPaymentTests(SubscriptionTestCase):
    def test_invoice_adds_16_percent_vat(self):
        invoice = SubscriptionService.issue_invoice(firm=self.firm, plan_code="BASIC", billing_cycle="MONTHLY", user=self.owner)
        self.assertEqual(invoice.amount_excl_vat, Decimal("2500.00"))
        self.assertEqual(invoice.vat_amount, Decimal("400.00"))
        self.assertEqual(invoice.total, Decimal("2900.00"))
        self.assertTrue(invoice.number.startswith(f"SUB-{timezone.now():%Y}-"))

    def test_downgrade_is_refused_while_usage_exceeds_the_smaller_plan(self):
        for n in range(3):
            u = make_user(f"adv{n}@saas.test", UserRole.STAFF, f"+25474400010{n}")
            Lawyer.objects.create(user=u, law_firm=self.firm, staff_number=f"X-{n}", admission_number=f"P.105/{n}/21", date_hired=date(2021, 1, 1))
        with self.assertRaises(ValidationError) as caught:
            SubscriptionService.issue_invoice(firm=self.firm, plan_code="BASIC", billing_cycle="MONTHLY", user=self.owner)
        self.assertIn("Advocates: 4 in use", str(caught.exception.detail))

    def test_mpesa_payment_flow_activates_and_renewal_extends_from_period_end(self):
        self.api.force_authenticate(self.owner)
        invoice = self.api.post("/api/subscription/invoices/", {"plan_code": "BASIC", "billing_cycle": "MONTHLY"}, format="json").data

        bad = self.api.post(f"/api/subscription/invoices/{invoice['id']}/payment/", {"mpesa_receipt": "123"}, format="json")
        self.assertEqual(bad.status_code, 400)
        paid = self.api.post(
            f"/api/subscription/invoices/{invoice['id']}/payment/",
            {"mpesa_receipt": "sib7xk2lq9", "payer_phone": "0711000111"}, format="json",
        )
        self.assertEqual(paid.status_code, 200, paid.data)
        self.assertEqual(paid.data["status"], SubscriptionInvoice.Status.PAYMENT_SUBMITTED)
        self.assertEqual(paid.data["mpesa_receipt"], "SIB7XK2LQ9")

        now = timezone.now()
        SubscriptionService.confirm_payment(invoice=SubscriptionInvoice.objects.get(id=invoice["id"]), confirmed_by=self.owner, now=now)
        subscription = FirmSubscription.objects.get(firm=self.firm)
        self.assertEqual(subscription.status, FirmSubscription.Status.ACTIVE)
        self.assertEqual(subscription.plan.code, "BASIC")
        self.assertEqual(subscription.current_period_end, add_months(now, 1))

        renewal = SubscriptionService.issue_invoice(firm=self.firm, plan_code="BASIC", billing_cycle="MONTHLY", user=self.owner)
        self.assertEqual(renewal.proration_credit, Decimal("0.00"))
        SubscriptionService.confirm_payment(invoice=renewal, confirmed_by=self.owner, now=now)
        subscription.refresh_from_db()
        self.assertEqual(subscription.current_period_end, add_months(add_months(now, 1), 1))

    def test_upgrade_mid_period_credits_unused_time(self):
        start = timezone.now() - timedelta(days=15)
        self.put_on(
            "BASIC", status=FirmSubscription.Status.ACTIVE, trial_ends_at=None,
            current_period_start=start, current_period_end=start + timedelta(days=30),
        )
        invoice = SubscriptionService.issue_invoice(firm=self.firm, plan_code="PRO", billing_cycle="MONTHLY", user=self.owner)
        self.assertAlmostEqual(invoice.proration_credit, Decimal("1250.00"), delta=Decimal("5"))
        self.assertEqual(invoice.amount_excl_vat, Decimal("5000.00") - invoice.proration_credit)

    def test_only_firm_administrators_manage_billing(self):
        staff = make_user("staff@saas.test", UserRole.STAFF, "+254744000020")
        LawFirmMember.objects.create(firm=self.firm, user=staff, role=FirmRole.SECRETARY, created_by=self.owner)
        self.api.force_authenticate(staff)
        self.assertEqual(self.api.get("/api/subscription/").status_code, 200)
        self.assertEqual(self.api.get("/api/subscription/invoices/").status_code, 403)
