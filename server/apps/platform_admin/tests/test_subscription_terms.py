from datetime import date, timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework.test import APIClient

from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.platform_admin.models import PlatformActivity
from apps.platform_admin.services.platform_monitoring_service import monthly_value
from apps.platform_admin.tests.test_platform_admin import PlatformTestCase
from apps.staff.models import Lawyer
from apps.subscriptions.models import FirmSubscription, Plan, SubscriptionInvoice
from apps.subscriptions.services import SubscriptionService
from apps.users.models import User


class SubscriptionTermsTests(PlatformTestCase):
    def setUp(self):
        super().setUp()
        data = self.register()
        self.firm = LawFirm.objects.get(pk=data['firm']['id'])
        self.url = f'/api/platform/firms/{self.firm.pk}/subscription/'

    def update(self, **terms):
        return self.api.post(self.url, terms, format='json')

    def invoice(self):
        return SubscriptionService.issue_invoice(
            firm=self.firm, plan_code='BASIC', billing_cycle='MONTHLY', user=self.firm.owner,
        )

    def test_custom_price_is_private_to_firm_and_used_on_invoice(self):
        plan = Plan.objects.get(code='BASIC')
        original_price = plan.monthly_price
        response = self.update(custom_monthly_price='1200.00', custom_annual_price='10000.00', pricing_reason='Negotiated fee')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['subscription']['effective_monthly_price'], '1200.00')
        invoice = self.invoice()
        self.assertEqual(invoice.list_price, Decimal('1200.00'))
        self.assertEqual(invoice.total, Decimal('1392.00'))
        plan.refresh_from_db()
        self.assertEqual(plan.monthly_price, original_price)
        self.assertIn('Negotiated fee', PlatformActivity.objects.filter(firm=self.firm).first().summary)
        self.assertEqual(self.update(custom_monthly_price=None, custom_annual_price=None, pricing_reason='Return to standard').status_code, 200)
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, SubscriptionInvoice.Status.VOID)
        self.assertEqual(self.invoice().list_price, original_price)

    def test_complimentary_access_and_revenue_and_no_checkout(self):
        issued = self.invoice()
        response = self.update(is_complimentary=True, pricing_reason='Legal aid sponsorship')
        self.assertEqual(response.status_code, 200, response.data)
        terms = response.data['subscription']
        self.assertEqual(terms['effective_status'], 'ACTIVE')
        self.assertTrue(terms['writable'])
        self.assertEqual(terms['effective_monthly_price'], '0.00')
        subscription = FirmSubscription.objects.get(firm=self.firm)
        self.assertEqual(monthly_value(subscription), Decimal('0.00'))
        issued.refresh_from_db()
        self.assertEqual(issued.status, SubscriptionInvoice.Status.VOID)
        owner = APIClient()
        owner.force_authenticate(self.firm.owner)
        response = owner.post('/api/subscription/invoices/', {'plan_code': 'BASIC', 'billing_cycle': 'MONTHLY'})
        self.assertEqual(response.status_code, 400)
        self.assertNotIn('pricing_reason', owner.get('/api/subscription/').data)

    def test_reason_validation_and_platform_only_access(self):
        self.assertEqual(self.update(is_complimentary=True).status_code, 400)
        self.assertEqual(self.update(custom_monthly_price='-1', pricing_reason='Invalid').status_code, 400)
        self.assertEqual(self.update(custom_monthly_price='NaN', pricing_reason='Invalid').status_code, 400)
        self.api.force_authenticate(self.firm.owner)
        self.assertEqual(self.update(is_complimentary=True, pricing_reason='Self waiver').status_code, 403)

    def test_submitted_payment_requires_resolution_and_paid_invoice_is_preserved(self):
        invoice = self.invoice()
        invoice.status = SubscriptionInvoice.Status.PAYMENT_SUBMITTED
        invoice.save()
        self.assertEqual(self.update(custom_monthly_price='1000', pricing_reason='Discount').status_code, 400)
        invoice.status = SubscriptionInvoice.Status.PAID
        invoice.save()
        self.assertEqual(self.update(custom_monthly_price='1000', pricing_reason='Discount').status_code, 200)
        invoice.refresh_from_db()
        self.assertEqual(invoice.status, SubscriptionInvoice.Status.PAID)
        self.assertEqual(invoice.list_price, Decimal('2500'))

    def test_dated_complimentary_access_expires(self):
        response = self.update(is_complimentary=True, pricing_reason='One month sponsorship',
                               current_period_end=(timezone.now() - timedelta(days=10)).isoformat(), grace_period_days=0)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['subscription']['effective_status'], 'EXPIRED')

    def test_advocate_pricing_and_frozen_invoice_amount(self):
        plan = Plan.objects.get(code='BASIC')
        response = self.api.patch(f'/api/platform/plans/{plan.pk}/', {'pricing_basis': 'ADVOCATE'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        user = User.objects.create_user(email='second@terms.test', password='pass', first_name='Second', last_name='Advocate',
                                        phone_number='TERMS2', national_id_number='TERMS2', role=UserRole.STAFF)
        lawyer = Lawyer.objects.create(user=user, law_firm=self.firm, staff_number='ADV-0002', admission_number='TERMS2', date_hired=date.today())
        invoice = self.invoice()
        self.assertEqual(invoice.list_price, Decimal('5000'))
        lawyer.is_active = False
        lawyer.save()
        self.assertEqual(SubscriptionService.summary(self.firm)['effective_monthly_price'], '2500.00')
        invoice.refresh_from_db()
        self.assertEqual(invoice.list_price, Decimal('5000'))
        self.assertEqual(self.update(custom_monthly_price='1700', pricing_reason='Fixed negotiated total').status_code, 200)
        self.assertEqual(self.invoice().list_price, Decimal('1700'))

    def test_returning_to_paid_billing_requires_an_end_date(self):
        self.assertEqual(self.update(is_complimentary=True, pricing_reason='Sponsored').status_code, 200)
        self.assertEqual(self.update(is_complimentary=False, pricing_reason='Sponsorship ended').status_code, 400)
        response = self.update(is_complimentary=False, pricing_reason='Sponsorship ended',
                               current_period_end=(timezone.now() + timedelta(days=7)).isoformat())
        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(response.data['subscription']['is_complimentary'])
        self.assertEqual(response.data['subscription']['effective_monthly_price'], '2500.00')
