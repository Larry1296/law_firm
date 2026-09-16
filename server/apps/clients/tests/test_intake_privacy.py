from datetime import timedelta
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction, connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase, TransactionTestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from apps.audit_logs.models import AuditEvent
from apps.clients.models import IntakePrivacyConfig, Client
from apps.clients.tests.test_prospective_creation import person, prospect_payload
from apps.common.choices import UserRole, FirmRole
from apps.firm.models import LawFirm, LawFirmMember


class IntakePrivacyTests(TestCase):
    def setUp(self):
        self.owner = person('privacy-owner@test.example')
        self.firm = LawFirm.objects.create(owner=self.owner, name='Privacy', registration_number='PRIV-1')
        self.other_owner = person('privacy-other@test.example')
        self.other_firm = LawFirm.objects.create(owner=self.other_owner, name='Other', registration_number='PRIV-2')
        self.api = APIClient()
        self.api.force_authenticate(self.owner)
        self.url = reverse('intake-privacy-list')
        self.data = dict(policy_version='v1', notice_text='Our approved notice.', lawful_basis='LEGITIMATE_INTERESTS', effective_date=str(timezone.localdate()))

    def create(self, version='v1'):
        response = self.api.post(self.url, {**self.data, 'policy_version': version}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        return response.data['id']

    def action(self, pk, action='activate'):
        return self.api.post(reverse('intake-privacy-action', args=[pk, action]), {}, format='json')

    def test_full_lifecycle_and_prospect_uses_current_version(self):
        self.assertEqual(self.api.post(reverse('admin-prospective-create'), prospect_payload(), format='json').status_code, 400)
        first = self.create()
        self.assertIsNone(IntakePrivacyConfig.active_for(self.firm))
        self.assertEqual(self.action(first).status_code, 200)
        created = self.api.post(reverse('admin-prospective-create'), prospect_payload(), format='json')
        self.assertEqual(created.status_code, 201, created.data)
        client = Client.objects.get(pk=created.data['client']['id'])
        second = self.create('v2')
        self.assertEqual(self.action(second).status_code, 200)
        old = IntakePrivacyConfig.objects.get(pk=first)
        self.assertEqual(old.status, 'RETIRED')
        self.assertEqual(old.retired_by, self.owner)
        self.assertEqual(IntakePrivacyConfig.objects.filter(firm=self.firm, status='ACTIVE').count(), 1)
        self.assertEqual(IntakePrivacyConfig.active_for(self.firm).pk, second)
        self.assertEqual(client.privacy.privacy_notice_version, 'v1')
        metadata = self.api.get(reverse('client-onboarding-metadata')).data['intake_privacy']
        self.assertEqual(metadata['policy_version'], 'v2')
        self.assertEqual(self.action(second, 'retire').status_code, 200)
        self.assertIsNone(IntakePrivacyConfig.active_for(self.firm))
        self.assertEqual(self.api.post(reverse('admin-prospective-create'), prospect_payload(), format='json').status_code, 400)
        self.api.get(self.url)
        actions = set(AuditEvent.objects.filter(firm=self.firm).values_list('action', flat=True))
        self.assertTrue({'INTAKE_PRIVACY_CREATED', 'INTAKE_PRIVACY_APPROVED', 'INTAKE_PRIVACY_ACTIVATED', 'INTAKE_PRIVACY_RETIRED', 'INTAKE_PRIVACY_LISTED'} <= actions)

    def test_permissions_and_firm_isolation(self):
        pk = self.create()
        for role in [UserRole.STAFF, UserRole.PROSPECT, UserRole.OFFICIAL_CLIENT, UserRole.ADMIN]:
            user = person(f'privacy-{role}@test.example', role)
            self.api.force_authenticate(user)
            self.assertEqual(self.api.get(self.url).status_code, 403)
            self.assertEqual(self.api.post(self.url, self.data, format='json').status_code, 403)
            self.assertEqual(self.action(pk).status_code, 403)
            self.assertEqual(self.action(pk, 'retire').status_code, 403)
        self.api.force_authenticate(None)
        self.assertIn(self.api.get(self.url).status_code, [401, 403])
        self.api.force_authenticate(self.other_owner)
        self.assertEqual(self.api.get(self.url).data['results'], [])
        self.assertEqual(self.action(pk).status_code, 404)
        self.assertEqual(self.action(pk, 'retire').status_code, 404)
        self.create()  # Same version string is allowed in another firm.
        delegated = person('privacy-delegated@test.example')
        membership = LawFirmMember.objects.create(firm=self.firm, user=delegated, role=FirmRole.LAWYER)
        self.api.force_authenticate(delegated)
        self.assertEqual(len(self.api.get(self.url).data['results']), 1)
        self.assertEqual(self.action(pk).status_code, 200)
        membership.is_active = False
        membership.save()
        self.assertEqual(self.api.get(self.url).status_code, 403)
        self.owner.is_active = False
        self.owner.save()
        self.api.force_authenticate(self.owner)
        self.assertEqual(self.api.get(self.url).status_code, 403)

    def test_validation_and_immutable_history(self):
        pk = self.create()
        self.assertEqual(self.api.post(self.url, self.data, format='json').status_code, 400)
        for overrides in [{'status': 'ACTIVE'}, {'approved_by': str(self.owner.pk)}, {'firm': str(self.other_firm.pk)}, {'notice_text': ' '}, {'lawful_basis': 'INVALID'}, {'effective_date': 'invalid'}]:
            self.assertEqual(self.api.post(self.url, {**self.data, 'policy_version': 'invalid', **overrides}, format='json').status_code, 400)
        future = self.api.post(self.url, {**self.data, 'policy_version': 'future', 'effective_date': str(timezone.localdate() + timedelta(days=1))}, format='json')
        self.assertEqual(self.action(future.data['id']).status_code, 400)
        self.assertEqual(self.action(pk, 'retire').status_code, 400)
        self.assertEqual(self.action(pk).status_code, 200)
        self.assertEqual(self.action(pk).status_code, 400)
        for field, value in [('notice_text', 'Changed'), ('policy_version', 'changed'), ('lawful_basis', 'CONSENT'), ('firm', self.other_firm), ('approved_at', None), ('activated_at', None)]:
            config = IntakePrivacyConfig.objects.get(pk=pk)
            setattr(config, field, value)
            with self.assertRaises(ValidationError):
                config.save()
        with self.assertRaises(ValidationError):
            IntakePrivacyConfig.objects.filter(pk=pk).update(notice_text='Changed')
        with self.assertRaises(ValidationError):
            IntakePrivacyConfig.objects.get(pk=pk).delete()
        with self.assertRaises(ValidationError):
            IntakePrivacyConfig.objects.filter(pk=pk).delete()
        url = reverse('intake-privacy-action', args=[pk, 'activate'])
        self.assertEqual(self.api.patch(url, {'notice_text': 'Changed'}, format='json').status_code, 405)
        self.assertEqual(self.api.delete(url).status_code, 405)
        self.assertEqual(self.action(pk, 'retire').status_code, 200)
        self.assertEqual(self.action(pk).status_code, 400)
        config = IntakePrivacyConfig.objects.get(pk=pk)
        config.notice_text = 'Changed retired notice'
        with self.assertRaises(ValidationError):
            config.save()

    def test_database_enforces_active_uniqueness_and_approval(self):
        self.action(self.create())
        with self.assertRaises(IntegrityError), transaction.atomic():
            IntakePrivacyConfig.objects.bulk_create([IntakePrivacyConfig(firm=self.firm, **{**self.data, 'policy_version': 'v2'}, status='ACTIVE', approved_by=self.owner, approved_at=timezone.now(), activated_by=self.owner, activated_at=timezone.now(), id=999)])
        with self.assertRaises(IntegrityError), transaction.atomic():
            IntakePrivacyConfig.objects.bulk_create([IntakePrivacyConfig(firm=self.other_firm, **self.data, status='ACTIVE')])


class IntakePrivacyMigrationTests(TransactionTestCase):
    def test_existing_approved_version_is_preserved(self):
        previous = [('clients', '0042_intakeprivacyconfig')]
        current = [('clients', '0043_remove_intakeprivacyconfig_is_active_and_more')]
        executor = MigrationExecutor(connection)
        executor.migrate(previous)
        try:
            apps = executor.loader.project_state(previous).apps
            User = apps.get_model('users', 'User')
            Firm = apps.get_model('firm', 'LawFirm')
            Config = apps.get_model('clients', 'IntakePrivacyConfig')
            owner = User.objects.create(email='legacy-owner@example.test', national_id_number='legacy-owner', phone_number='legacy-owner', role='ADMIN')
            firm = Firm.objects.create(owner=owner, name='Legacy', registration_number='LEGACY')
            approved_at = timezone.now() - timedelta(days=10)
            config = Config.objects.create(firm=firm, policy_version='legacy-v1', lawful_basis='LEGAL_OBLIGATION', is_active=True, approved_by=owner, approved_at=approved_at)
            pk, firm_id, owner_id = config.pk, firm.pk, owner.pk
        finally:
            MigrationExecutor(connection).migrate(current)
        config = IntakePrivacyConfig.objects.get(pk=pk)
        self.assertEqual(config.status, 'ACTIVE')
        self.assertEqual(config.approved_at, approved_at)
        self.assertEqual(config.activated_at, approved_at)
        self.assertEqual(config.activated_by_id, owner_id)
        self.assertEqual(config.notice_text, '')
        self.assertEqual(IntakePrivacyConfig.active_for(firm_id).pk, pk)
        from apps.clients.services.intake_privacy_service import transition_config
        from apps.firm.models import LawFirm
        from apps.users.models import User
        transition_config(firm=LawFirm.objects.get(pk=firm_id), user=User.objects.get(pk=owner_id), pk=pk, action='retire')
        config.refresh_from_db()
        self.assertEqual(config.status, 'RETIRED')
