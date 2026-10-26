import tempfile
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Event
from unittest import skipUnless
from unittest.mock import patch

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.test import TransactionTestCase, override_settings
from django.db import connection, close_old_connections, transaction
from django.http import Http404
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.cases.models import Case
from apps.cases.tests import test_end_to_end_litigation as litigation
from apps.clients.models import Client
from apps.common.choices import UserRole
from apps.firm.models import LawFirm, LawFirmMember
from apps.platform_admin.models import FirmFileCleanup, PlatformActivity
from apps.platform_admin.services.trial_firm_deletion_service import TrialFirmDeletionService
from apps.platform_admin.tests.test_platform_admin import PlatformTestCase
from apps.subscriptions.models import FirmSubscription, SubscriptionInvoice
from apps.subscriptions.services import SubscriptionService
from apps.users.models import User


class TrialFirmDeletionTests(PlatformTestCase):
    def setUp(self):
        super().setUp()
        SubscriptionService.ensure_plan('BASIC')
        self.result = self.register()
        self.firm = LawFirm.objects.get(pk=self.result['firm']['id'])
        self.url = f'/api/platform/firms/{self.firm.pk}/'

    def delete(self, **values):
        return self.api.delete(self.url, {'confirmation': self.firm.name, **values}, format='json')

    def test_exact_confirmation_and_platform_access_are_required(self):
        self.assertEqual(self.delete(confirmation='wrong firm').status_code, 400)
        self.assertTrue(LawFirm.objects.filter(pk=self.firm.pk).exists())
        self.api.force_authenticate(self.firm.owner)
        self.assertEqual(self.delete().status_code, 403)
        self.assertTrue(LawFirm.objects.filter(pk=self.firm.pk).exists())

    def test_expired_trial_is_eligible_and_owner_account_tokens_are_removed(self):
        FirmSubscription.objects.filter(firm=self.firm).update(trial_ends_at=timezone.now() - timedelta(days=1))
        owner_id = self.firm.owner_id
        token = RefreshToken.for_user(self.firm.owner)
        data = self.api.get(self.url).data
        self.assertTrue(data['can_delete_trial'])
        self.assertTrue(self.api.get('/api/platform/firms/').data['results'][0]['can_delete_trial'])
        with self.captureOnCommitCallbacks(execute=True):
            response = self.delete()
        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(LawFirm.objects.filter(pk=self.firm.pk).exists())
        self.assertFalse(User.objects.filter(pk=owner_id).exists())
        self.assertTrue(User.objects.filter(pk=self.platform_admin.pk).exists())
        self.assertEqual(self.api.get(self.url).status_code, 404)
        api = APIClient()
        api.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')
        self.assertEqual(api.get('/api/admin/firm/').status_code, 401)

    def test_previous_paid_period_cannot_be_deleted_even_if_now_expired_trial(self):
        subscription = self.firm.subscription
        subscription.status = FirmSubscription.Status.ACTIVE
        subscription.save(update_fields=['status'])
        subscription.status = FirmSubscription.Status.TRIALING
        subscription.trial_ends_at = timezone.now() - timedelta(days=60)
        subscription.has_ever_subscribed = False
        subscription.save()
        subscription.refresh_from_db()
        self.assertTrue(subscription.has_ever_subscribed)
        self.assertFalse(self.api.get(self.url).data['can_delete_trial'])
        self.assertEqual(self.delete().status_code, 400)
        self.assertTrue(LawFirm.objects.filter(pk=self.firm.pk).exists())

    def test_paid_or_pending_payment_history_blocks_deletion(self):
        invoice = SubscriptionService.issue_invoice(firm=self.firm, plan_code='BASIC', billing_cycle='MONTHLY', user=self.platform_admin)
        for state in [SubscriptionInvoice.Status.PAID, SubscriptionInvoice.Status.PAYMENT_SUBMITTED]:
            SubscriptionInvoice.objects.filter(pk=invoice.pk).update(status=state)
            self.assertEqual(self.delete().status_code, 400)
        SubscriptionInvoice.objects.filter(pk=invoice.pk).update(status='VOID', confirmed_at=timezone.now())
        self.assertEqual(self.delete().status_code, 400)
        self.assertTrue(LawFirm.objects.filter(pk=self.firm.pk).exists())

    def test_complimentary_access_is_not_an_unsubscribed_trial(self):
        FirmSubscription.objects.filter(firm=self.firm).update(is_complimentary=True)
        self.assertEqual(self.delete().status_code, 400)

    def test_shared_account_and_other_firm_are_preserved(self):
        other = LawFirm.objects.create(name='Other tenant', registration_number='OTHER-DELETE-TEST', owner=self.platform_admin)
        owner_id = self.firm.owner_id
        LawFirmMember.objects.create(firm=other, user=self.firm.owner, role='LAWYER', created_by=self.platform_admin)
        self.assertEqual(self.delete().status_code, 200)
        self.assertTrue(LawFirm.objects.filter(pk=other.pk).exists())
        self.assertTrue(User.objects.filter(pk=owner_id).exists())
        self.assertTrue(LawFirmMember.objects.filter(firm=other, user_id=owner_id).exists())

    def test_uploaded_files_are_deleted_after_commit_and_failures_can_retry(self):
        with tempfile.TemporaryDirectory() as directory, override_settings(MEDIA_ROOT=directory):
            self.firm.logo.save('trial-logo.png', ContentFile(b'fake image for storage test'), save=True)
            name = self.firm.logo.name
            with patch.object(default_storage, 'delete', side_effect=OSError('storage unavailable')):
                with self.captureOnCommitCallbacks(execute=True):
                    response = self.delete()
            self.assertEqual(response.status_code, 200, response.data)
            self.assertTrue(response.data['file_cleanup_pending'])
            self.assertTrue(FirmFileCleanup.objects.filter(name=name).exists())
            self.assertTrue(default_storage.exists(name))
            TrialFirmDeletionService.cleanup_files()
            self.assertFalse(default_storage.exists(name))
            self.assertFalse(FirmFileCleanup.objects.exists())


class FullTrialTenantDeletionTests(litigation.EndToEndLitigationTests):
    def test_walk_in_to_archive(self):
        # Populate every protected lifecycle/finance layer before tenant erasure.
        with tempfile.TemporaryDirectory() as directory, override_settings(MEDIA_ROOT=directory):
            super().test_walk_in_to_archive()
            firm_id = self.firm.pk
            account_ids = [self.partner.pk, self.advocate_user.pk, self.secretary_user.pk, self.accountant_user.pk]
            client_ids = list(Client.objects.filter(firm=self.firm).values_list('pk', flat=True))
            client_user_ids = list(Client.objects.filter(firm=self.firm).values_list('user_id', flat=True))
            platform = User.objects.create_platform_admin(email='delete-operator@example.test', password='Test-pass-2026!', first_name='Delete', last_name='Operator', phone_number='DELETEOPS', national_id_number='DELETEOPS')
            self.api.force_authenticate(platform)
            with self.captureOnCommitCallbacks(execute=True):
                response = self.api.delete(f'/api/platform/firms/{firm_id}/', {'confirmation': self.firm.name}, format='json')
            self.assertEqual(response.status_code, 200, response.data)
            self.assertFalse(LawFirm.objects.filter(pk=firm_id).exists())
            self.assertFalse(Case.objects.filter(firm_id=firm_id).exists())
            self.assertFalse(Client.objects.filter(pk__in=client_ids).exists())
            self.assertFalse(User.objects.filter(pk__in=account_ids + client_user_ids).exists())
            self.assertFalse(FirmFileCleanup.objects.exists())
            self.assertTrue(PlatformActivity.objects.filter(action='FIRM_DELETED', actor=platform, firm=None).exists())


@skipUnless(connection.vendor == 'postgresql', 'Requires PostgreSQL row locks.')
class TrialDeletionConcurrencyTests(TransactionTestCase):
    def test_payment_cannot_be_submitted_after_deletion_wins_the_firm_lock(self):
        platform = User.objects.create_platform_admin(email='race-operator@example.test', password='Test-pass-2026!', first_name='Race', last_name='Operator', phone_number='RACEOPS', national_id_number='RACEOPS')
        owner = User.objects.create_user(email='race-owner@example.test', password='Test-pass-2026!', first_name='Race', last_name='Owner', phone_number='RACEOWNER', national_id_number='RACEOWNER', role=UserRole.ADMIN)
        firm = LawFirm.objects.create(name='Deletion race firm', registration_number='RACE-FIRM', owner=owner)
        invoice = SubscriptionService.issue_invoice(firm=firm, plan_code=firm.subscription.plan.code, billing_cycle='MONTHLY', user=platform)
        started = Event()
        def payment():
            close_old_connections()
            try:
                started.set()
                SubscriptionService.submit_payment(invoice=invoice, mpesa_receipt='SIB7XK2LQ9', user=owner)
            finally:
                connection.close()
        with ThreadPoolExecutor(max_workers=1) as pool:
            with transaction.atomic():
                LawFirm.objects.select_for_update().get(pk=firm.pk)
                future = pool.submit(payment)
                self.assertTrue(started.wait(5))
                TrialFirmDeletionService.delete(actor=platform, firm_id=firm.pk, confirmation=firm.name)
            with self.assertRaises(Http404):
                future.result(timeout=10)
        self.assertFalse(LawFirm.objects.filter(pk=firm.pk).exists())
