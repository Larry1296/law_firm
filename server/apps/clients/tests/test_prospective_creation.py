from datetime import date
from unittest.mock import patch
from django.core import mail
from django.test import TestCase
from django.utils import timezone
from apps.clients.models import IntakePrivacyConfig
from django.urls import reverse
from rest_framework.test import APIClient
from apps.audit_logs.models import AuditEvent
from apps.cases.models import Case
from apps.clients.models import Client, ClientMatterConflictCheck, EngagementRecord
from apps.clients.onboarding_metadata import CANONICAL_CLIENT_TYPES
from apps.clients.prospective_metadata import PROSPECTIVE_PROFILES, REPRESENTATIVE_TYPES
from apps.clients.services.onboarding_service import PROFILE_MODELS
from apps.clients.services.prospective_client_service import ProspectiveClientService
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.staff.models import Lawyer, Secretary, SecretaryPermissionGrant
from apps.users.models import User


def person(email, role=UserRole.ADMIN):
    return User.objects.create_user(email=email, password='test-password', first_name='Test', last_name='Person',
                                   national_id_number=email[:20], phone_number=email[:20], role=role)


def prospect_payload(kind='INDIVIDUAL', access='ASSISTED'):
    payload = {'full_name': f'Prospective {kind}', 'client_type': kind, 'access_type': access,
               'email': 'prospect@example.test', 'phone_number': '+254700098765',
               'privacy': {'privacy_notice_delivered': True, 'delivery_method': 'PAPER'}, 'legal_profile': {}}
    for field in PROSPECTIVE_PROFILES[kind]['fields']:
        if field['required']:
            payload['legal_profile'][field['key']] = field['options'][0]['value'] if field.get('options') else 'Preliminary value'
    if kind == 'OTHER_REQUIRES_REVIEW':
        payload.update(provisional_legal_description='Unresolved body', classification_review_reason='Instrument not yet available')
    if kind != 'INDIVIDUAL':
        payload['representative'] = {'full_legal_name': 'Portal Contact', 'representative_category': REPRESENTATIVE_TYPES[kind][0],
                                     'role_title': 'Stated representative', 'email': 'contact@example.test', 'telephone': '+254700098766',
                                     'is_portal_contact': access == 'PORTAL_ENABLED'}
    return payload


class ProspectiveCreationTests(TestCase):
    def setUp(self):
        self.admin = person('prospect-admin@example.test')
        self.firm = LawFirm.objects.create(owner=self.admin, name='Prospective Firm', registration_number='PROSPECT-1')
        IntakePrivacyConfig.objects.create(firm=self.firm, policy_version='2026.1', lawful_basis='LEGITIMATE_INTERESTS', notice_text='Approved notice', status='ACTIVE', approved_by=self.admin, approved_at=timezone.now(), activated_by=self.admin, activated_at=timezone.now())
        self.api = APIClient()
        self.api.force_authenticate(self.admin)
        self.url = reverse('admin-prospective-create')

    def accept(self, client):
        lawyer, _ = Lawyer.objects.get_or_create(user=self.admin, defaults=dict(law_firm=self.firm, staff_number='GATE-A', admission_number='GATE-A', date_hired=date(2026, 1, 1)))
        return ClientMatterConflictCheck.objects.create(client=client, firm=self.firm, responsible_lawyer=lawyer,
            reference_number=f'GATE-{client.id}', proposed_matter_title='Advice', proposed_instructions='Advice',
            status='CLEARED', acceptance_decision='ACCEPTED')

    def create(self, kind='INDIVIDUAL', access='ASSISTED'):
        response = self.api.post(self.url, prospect_payload(kind, access), format='json')
        self.assertEqual(response.status_code, 201, response.data)
        return Client.objects.get(pk=response.data['client']['id'])

    def test_all_canonical_categories_create_unverified_profiles(self):
        before = User.objects.count()
        for kind in CANONICAL_CLIENT_TYPES:
            with self.subTest(kind=kind):
                client = self.create(kind)
                self.assertEqual(client.lifecycle_status, 'PROSPECTIVE')
                self.assertIsNone(client.user_id)
                self.assertFalse(client.is_verified)
                self.assertEqual(client.due_diligence.identity_verification_status, 'NOT_STARTED')
                self.assertEqual(client.due_diligence.pep_status, 'NOT_CHECKED')
                self.assertEqual(client.due_diligence.sanctions_screening_status, 'NOT_CHECKED')
                self.assertFalse(client.due_diligence.authority_verified)
                self.assertTrue(client.privacy.privacy_notice_delivered)
                self.assertEqual(client.privacy.delivered_by, self.admin)
                if kind in PROFILE_MODELS:
                    profile = PROFILE_MODELS[kind].objects.get(client=client)
                    if hasattr(profile, 'registration_verified'):
                        self.assertFalse(profile.registration_verified)
                self.assertFalse(client.representatives.filter(is_verified=True).exists())
                self.assertFalse(client.representatives.filter(is_authorized_to_give_instructions=True).exists())
        self.assertEqual(User.objects.count(), before)
        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(Case.objects.count(), 0)
        self.assertEqual(ClientMatterConflictCheck.objects.count(), 0)
        self.assertEqual(EngagementRecord.objects.count(), 0)

    def test_multiple_companies_without_registration_number(self):
        self.create('COMPANY')
        second = self.create('COMPANY')
        self.assertIsNone(second.company_profile.registration_number)
        self.assertEqual(second.company_profile.company_status, 'UNKNOWN')

    def test_rejects_legacy_and_unsupported_categories_and_access(self):
        for field, values in [('client_type', ['NGO', 'BUSINESS_ENTITY', 'BOGUS']), ('access_type', ['PROSPECT', 'ASSISTED_CLIENT', 'FIRM_MANAGED', 'BOGUS'])]:
            for value in values:
                with self.subTest(field=field, value=value):
                    payload = prospect_payload(); payload[field] = value
                    self.assertEqual(self.api.post(self.url, payload, format='json').status_code, 400)

    def test_client_controlled_security_fields_are_rejected(self):
        for key, value in [('firm', str(self.firm.id)), ('created_by', str(self.admin.id)), ('lifecycle_status', 'OFFICIAL'), ('is_verified', True), ('user', str(self.admin.id)), ('due_diligence', {'identity_verification_status': 'VERIFIED'}), ('password', 'permanent')]:
            with self.subTest(key=key):
                payload = prospect_payload(); payload[key] = value
                self.assertEqual(self.api.post(self.url, payload, format='json').status_code, 400)
        self.assertEqual(Client.objects.count(), 0)

    def test_category_switch_payload_cannot_leak_fields(self):
        for kind, stale in [('INDIVIDUAL', {'company_name': 'Old company'}), ('TRUST', {'registration_number': 'OLD'}), ('COMPANY', {'trust_name': 'Old trust'}), ('INDIVIDUAL', {'identification_verified': True})]:
            with self.subTest(kind=kind):
                payload = prospect_payload(kind); payload['legal_profile'].update(stale)
                self.assertEqual(self.api.post(self.url, payload, format='json').status_code, 400)

    def test_category_requirements_and_representative_capacity(self):
        for kind in CANONICAL_CLIENT_TYPES:
            for field in PROSPECTIVE_PROFILES[kind]['fields']:
                if field['required']:
                    payload = prospect_payload(kind); del payload['legal_profile'][field['key']]
                    self.assertEqual(self.api.post(self.url, payload, format='json').status_code, 400)
        for kind in ['COMPANY', 'TRUST', 'ESTATE', 'PUBLIC_ENTITY']:
            payload = prospect_payload(kind); payload.pop('representative')
            self.assertEqual(self.api.post(self.url, payload, format='json').status_code, 400)
        payload = prospect_payload('COMPANY'); payload['representative']['representative_category'] = 'TRUSTEE'
        self.assertEqual(self.api.post(self.url, payload, format='json').status_code, 400)
        payload = prospect_payload(); payload['acting_for_self'] = False
        self.assertEqual(self.api.post(self.url, payload, format='json').status_code, 400)

    def test_representative_verification_and_cross_firm_links_rejected(self):
        for key, value in [('is_verified', True), ('is_authorized_to_give_instructions', True), ('linked_client', str(self.firm.id))]:
            payload = prospect_payload('COMPANY'); payload['representative'][key] = value
            self.assertEqual(self.api.post(self.url, payload, format='json').status_code, 400)

    def test_privacy_evidence_is_required(self):
        for field in ['privacy_notice_delivered', 'delivery_method']:
            payload = prospect_payload(); payload['privacy'].pop(field)
            self.assertEqual(self.api.post(self.url, payload, format='json').status_code, 400)
        payload = prospect_payload(); payload['privacy']['privacy_notice_delivered'] = False
        self.assertEqual(self.api.post(self.url, payload, format='json').status_code, 400)

    def test_portal_requires_individual_email_or_organisation_contact(self):
        payload = prospect_payload(access='PORTAL_ENABLED'); payload.pop('email')
        self.assertEqual(self.api.post(self.url, payload, format='json').status_code, 400)
        for field in ['email', 'is_portal_contact']:
            payload = prospect_payload('COMPANY', 'PORTAL_ENABLED'); payload['representative'].pop(field)
            self.assertEqual(self.api.post(self.url, payload, format='json').status_code, 400)

    def test_portal_remains_pending_then_uses_controlled_account_service(self):
        for kind in ['INDIVIDUAL', 'COMPANY']:
            with self.subTest(kind=kind):
                client = self.create(kind, 'PORTAL_ENABLED')
                self.assertIsNone(client.user_id)
                self.assertEqual(client.portal_status, 'PORTAL_ENABLED_PENDING')
                self.accept(client)
                response = self.api.post(reverse('admin-prospective-invite', args=[client.id]))
                self.assertEqual(response.status_code, 200, response.data)
                self.assertNotIn('password', str(response.data).lower())
                client.refresh_from_db()
                self.assertEqual(client.lifecycle_status, 'PROSPECTIVE')
                self.assertEqual(client.user.role, UserRole.PROSPECT)
                self.assertFalse(client.user.has_usable_password())
                self.assertEqual(client.portal_status, 'INVITED')
                self.assertIn('/reset-password?', mail.outbox[-1].body)
                self.assertEqual(self.api.post(reverse('admin-prospective-invite', args=[client.id])).status_code, 400)

    def test_assisted_invitation_is_rejected(self):
        client = self.create()
        self.assertEqual(self.api.post(reverse('admin-prospective-invite', args=[client.id])).status_code, 400)
        self.assertIsNone(Client.objects.get(pk=client.id).user_id)

    def test_profile_and_audit_failures_roll_back_creation(self):
        for target in ['apps.clients.services.prospective_client_service.AuditService.record', 'apps.clients.models.individual_client.IndividualClient.save']:
            with self.subTest(target=target), patch(target, side_effect=RuntimeError('test failure')):
                with self.assertRaises(RuntimeError):
                    ProspectiveClientService.create(user=self.admin, data=prospect_payload())
            self.assertEqual(Client.objects.count(), 0)
            self.assertEqual(AuditEvent.objects.count(), 0)

    def test_portal_and_delivery_failure_roll_back_invitation(self):
        client = self.create(access='PORTAL_ENABLED')
        self.accept(client)
        before = User.objects.count()
        for target in ['apps.clients.services.admin.client_admin_create_service.ClientAdminCreateService._create_portal_user', 'apps.authentication.services.auth_service.AuthService.request_password_reset', 'apps.clients.services.prospective_client_service.AuditService.record']:
            with self.subTest(target=target), patch(target, side_effect=RuntimeError('test failure')):
                with self.assertRaises(RuntimeError):
                    ProspectiveClientService.invite(user=self.admin, client_id=client.id)
            client.refresh_from_db()
            self.assertIsNone(client.user_id)
            self.assertEqual(client.portal_status, 'PORTAL_ENABLED_PENDING')
            self.assertEqual(User.objects.count(), before)

    def test_secretary_permission_and_unauthorised_staff(self):
        staff = person('secretary@example.test', UserRole.STAFF)
        secretary = Secretary.objects.create(user=staff, law_firm=self.firm, staff_number='SEC-1', date_hired=date(2026, 1, 1))
        self.api.force_authenticate(staff)
        url = reverse('secretary-prospective-create')
        self.assertEqual(self.api.post(url, prospect_payload(), format='json').status_code, 403)
        SecretaryPermissionGrant.objects.create(secretary=secretary, code='MANAGE_CLIENTS', granted_by=self.admin)
        response = self.api.post(url, prospect_payload(), format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Client.objects.get(pk=response.data['client']['id']).firm_id, self.firm.id)
        self.api.force_authenticate(person('staff@example.test', UserRole.STAFF))
        self.assertEqual(self.api.post(url, prospect_payload(), format='json').status_code, 403)

    def test_existing_clients_and_archive_official_unchanged(self):
        for status in ['OFFICIAL', 'ARCHIVED']:
            client = Client.objects.create(firm=self.firm, full_name=status, client_type='NGO', lifecycle_status=status)
            response = self.api.get(reverse('admin-prospective-detail', args=[client.id]))
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data['client']['lifecycle_status'], status)
            self.assertEqual(self.api.post(reverse('admin-prospective-invite', args=[client.id])).status_code, 400)
        self.create()
        self.assertEqual(Client.objects.filter(lifecycle_status__in=['OFFICIAL', 'ARCHIVED']).count(), 2)

    def test_metadata_is_canonical_and_contains_dynamic_minima(self):
        response = self.api.get(reverse('client-onboarding-metadata'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual([x['value'] for x in response.data['legal_client_types']], CANONICAL_CLIENT_TYPES)
        self.assertEqual(set(response.data['prospective_profiles']), set(CANONICAL_CLIENT_TYPES))

    def test_cross_firm_client_and_advocate_are_rejected(self):
        client = self.create()
        other_admin = person('other-admin@example.test')
        other_firm = LawFirm.objects.create(owner=other_admin, name='Other Firm', registration_number='OTHER-1')
        lawyer = Lawyer.objects.create(user=other_admin, law_firm=other_firm, staff_number='ADV-1', admission_number='ADV-1', date_hired=date(2026, 1, 1))
        data = {'client_id': str(client.id), 'proposed_matter': {'proposed_matter_title': 'Proposal', 'proposed_instructions': 'Broad advice', 'responsible_lawyer_id': str(lawyer.id), 'no_adverse_party_currently_known': True, 'no_adverse_party_explanation': 'Advice only'}}
        self.assertEqual(self.api.post(reverse('admin-proposed-matter-entry'), data, format='json').status_code, 400)
        self.api.force_authenticate(other_admin)
        self.assertEqual(self.api.post(reverse('admin-proposed-matter-entry'), data, format='json').status_code, 400)
        self.assertEqual(self.api.get(reverse('admin-prospective-detail', args=[client.id])).status_code, 404)

    def test_proposed_entry_uses_same_prospective_serializer_and_service(self):
        lawyer = Lawyer.objects.create(user=self.admin, law_firm=self.firm, staff_number='ADV-1', admission_number='ADV-1', date_hired=date(2026, 1, 1))
        data = {'prospective_client': prospect_payload('COMPANY'), 'proposed_matter': {'proposed_matter_title': 'Proposal', 'proposed_instructions': 'Broad advice', 'responsible_lawyer_id': str(lawyer.id), 'parties': [{'name': 'Other Company', 'party_type': 'ORGANISATION', 'role': 'PROPOSED_ADVERSE_PARTY'}]}}
        response = self.api.post(reverse('admin-proposed-matter-entry'), data, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        client = Client.objects.get(pk=response.data['client_id'])
        self.assertTrue(PROFILE_MODELS['COMPANY'].objects.filter(client=client).exists())
        self.assertEqual(response.data['conflict_check']['status'], 'NOT_STARTED')
        self.assertFalse(Case.objects.exists())
        self.assertFalse(EngagementRecord.objects.exists())

    def test_full_onboarding_requires_clearance_and_preserves_gates(self):
        client = self.create()
        data = {'client': {'full_name': client.full_name, 'client_type': 'INDIVIDUAL', 'access_type': 'ASSISTED'}, 'legal_profile': {'identification_type': 'NATIONAL_ID', 'identification_number': '12345678'}, 'privacy': {**prospect_payload()['privacy'], 'lawful_basis': 'LEGITIMATE_INTERESTS', 'privacy_notice_version': '2026.1'}}
        url = reverse('admin-complete-onboarding', args=[client.id])
        self.assertEqual(self.api.put(url, data, format='json').status_code, 400)
        lawyer = Lawyer.objects.create(user=self.admin, law_firm=self.firm, staff_number='ADV-1', admission_number='ADV-1', date_hired=date(2026, 1, 1))
        check = ClientMatterConflictCheck.objects.create(client=client, firm=self.firm, responsible_lawyer=lawyer, reference_number='TEST-1', proposed_matter_title='Advice', proposed_instructions='Advice', status='CLEARED')
        response = self.api.put(url, data, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        client.refresh_from_db(); check.refresh_from_db()
        self.assertEqual(client.individual_profile.identification_number, '12345678')
        self.assertEqual(client.lifecycle_status, 'PROSPECTIVE')
        self.assertEqual(check.acceptance_decision, 'PENDING')
        self.assertFalse(Case.objects.exists())
        self.assertFalse(EngagementRecord.objects.exists())

    def test_entry_options_are_firm_scoped_and_active(self):
        client = self.create()
        active = Lawyer.objects.create(user=self.admin, law_firm=self.firm, staff_number='OPTIONS-A', admission_number='OPTIONS-A', date_hired=date(2026, 1, 1))
        other = person('other-options@example.test')
        other_firm = LawFirm.objects.create(owner=other, name='Other', registration_number='OPTIONS-O')
        Lawyer.objects.create(user=other, law_firm=other_firm, staff_number='OPTIONS-O', admission_number='OPTIONS-O', date_hired=date(2026, 1, 1))
        response = self.api.get(reverse('admin-prospective-options'))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['advocates'], [{'value': str(active.id), 'label': self.admin.full_name}])
        self.assertEqual(response.data['clients'], [{'value': str(client.id), 'label': client.full_name}])
        active.is_active = False; active.save()
        self.assertEqual(self.api.get(reverse('admin-prospective-options')).data['advocates'], [])

    def test_authorised_secretary_records_proposal_but_not_decisions(self):
        client = self.create()
        lawyer = Lawyer.objects.create(user=self.admin, law_firm=self.firm, staff_number='ENTRY-A', admission_number='ENTRY-A', date_hired=date(2026, 1, 1))
        staff = person('entry-secretary@example.test', UserRole.STAFF)
        secretary = Secretary.objects.create(user=staff, law_firm=self.firm, staff_number='ENTRY-S', date_hired=date(2026, 1, 1))
        SecretaryPermissionGrant.objects.create(secretary=secretary, code='MANAGE_CLIENTS', granted_by=self.admin)
        self.api.force_authenticate(staff)
        payload = {'client_id': str(client.id), 'proposed_matter': {'proposed_matter_title': 'Secretary proposal', 'proposed_instructions': 'Broad advice', 'responsible_lawyer_id': str(lawyer.id), 'no_adverse_party_currently_known': True, 'no_adverse_party_explanation': 'Advice only'}}
        response = self.api.post(reverse('secretary-proposed-matter-entry'), payload, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        check = ClientMatterConflictCheck.objects.get(pk=response.data['conflict_check']['id'])
        self.assertEqual(check.created_by, staff)
        self.assertEqual(check.status, 'NOT_STARTED')
        from apps.clients.services.conflict import ClientMatterConflictService
        from rest_framework.exceptions import PermissionDenied
        with self.assertRaises(PermissionDenied):
            ClientMatterConflictService.get_user_firm(staff)

    def test_combined_entry_rolls_back_prospect_when_proposal_fails(self):
        lawyer = Lawyer.objects.create(user=self.admin, law_firm=self.firm, staff_number='ROLL-A', admission_number='ROLL-A', date_hired=date(2026, 1, 1))
        data = {'prospective_client': prospect_payload(), 'proposed_matter': {'proposed_matter_title': 'Proposal', 'proposed_instructions': 'Advice', 'responsible_lawyer_id': str(lawyer.id), 'no_adverse_party_currently_known': True, 'no_adverse_party_explanation': 'Advice only'}}
        from apps.clients.services.proposed_matter_entry_service import ProposedMatterEntryService
        with patch('apps.clients.services.proposed_matter_entry_service.ProspectiveMatterEntryService.create_proposed_matter', side_effect=RuntimeError('proposal failure')):
            with self.assertRaises(RuntimeError):
                ProposedMatterEntryService.create(user=self.admin, data=data)
        self.assertFalse(Client.objects.exists())
        self.assertFalse(AuditEvent.objects.exists())

    def test_invitation_requires_clearance_and_acceptance_on_same_proposal(self):
        client = self.create(access='PORTAL_ENABLED')
        url = reverse('admin-prospective-invite', args=[client.id])
        self.assertEqual(self.api.post(url).status_code, 400)
        check = self.accept(client)
        for status, decision in [('NOT_STARTED', 'PENDING'), ('CLEARED', 'PENDING'), ('IN_PROGRESS', 'ACCEPTED'), ('CLEARED', 'DECLINED')]:
            check.status = status; check.acceptance_decision = decision; check.save()
            self.assertEqual(self.api.post(url).status_code, 400)
            client.refresh_from_db()
            self.assertIsNone(client.user_id)
        self.assertEqual(len(mail.outbox), 0)

    def test_privacy_configuration_required_and_server_controlled(self):
        config = IntakePrivacyConfig.active_for(self.firm)
        from apps.clients.services.intake_privacy_service import transition_config
        transition_config(firm=self.firm, user=self.admin, pk=config.pk, action='retire')
        self.assertIsNone(self.api.get(reverse('client-onboarding-metadata')).data['intake_privacy'])
        self.assertEqual(self.api.post(self.url, prospect_payload(), format='json').status_code, 400)
        config = IntakePrivacyConfig.objects.create(firm=self.firm, policy_version='2026.2',
            notice_text='Replacement notice', lawful_basis='LEGITIMATE_INTERESTS')
        transition_config(firm=self.firm, user=self.admin, pk=config.pk, action='activate')
        for field, value in [('lawful_basis', 'CONSENT'), ('privacy_notice_version', 'forged'), ('delivered_by', self.admin.id), ('delivered_at', timezone.now().isoformat()), ('data_source', 'forged')]:
            payload = prospect_payload(); payload['privacy'][field] = value
            self.assertEqual(self.api.post(self.url, payload, format='json').status_code, 400)
        for acknowledged in [False, True]:
            payload = prospect_payload(); payload['privacy']['acknowledged'] = acknowledged
            response = self.api.post(self.url, payload, format='json')
            self.assertEqual(response.status_code, 201, response.data)
            privacy = Client.objects.get(pk=response.data['client']['id']).privacy
            self.assertEqual(privacy.lawful_basis, 'LEGITIMATE_INTERESTS')
            self.assertEqual(privacy.privacy_notice_version, config.policy_version)
            self.assertEqual(privacy.delivered_by, self.admin)
            self.assertIsNotNone(privacy.delivered_at)
            self.assertEqual(privacy.acknowledged, acknowledged)
        transition_config(firm=self.firm, user=self.admin, pk=config.pk, action='retire')
        self.assertEqual(self.api.post(self.url, prospect_payload(), format='json').status_code, 400)

    def test_pbo_requires_explicit_unverified_classification(self):
        payload = prospect_payload('NON_PROFIT_ORGANIZATION')
        payload['legal_profile'].pop('nonprofit_form')
        self.assertEqual(self.api.post(self.url, payload, format='json').status_code, 400)
        payload['legal_profile']['nonprofit_form'] = 'OTHER_NON_PROFIT'
        self.assertEqual(self.api.post(self.url, payload, format='json').status_code, 400)
        client = self.create('NON_PROFIT_ORGANIZATION')
        self.assertEqual(client.nonprofit_profile.pbo_or_ngo_status, 'UNVERIFIED')
        self.assertFalse(client.nonprofit_profile.registration_verified)
        for kind in ['COMPANY', 'TRUST', 'SOCIETY_OR_ASSOCIATION', 'OTHER_REQUIRES_REVIEW']:
            other = self.create(kind)
            self.assertFalse(hasattr(other, 'nonprofit_profile'))

    def test_proposal_includes_all_preliminary_identity_names(self):
        from apps.clients.services.conflict import ClientMatterConflictService
        from apps.clients.services.conflict.identity_names import client_identity_names
        client = self.create('SOLE_PROPRIETORSHIP')
        client.alternative_names = 'Former name; Another name'; client.save()
        client.sole_proprietorship_profile.trading_name = 'Trading brand'
        client.sole_proprietorship_profile.save()
        lawyer = self.accept(client).responsible_lawyer
        check = ClientMatterConflictService.create_proposed_matter(user=self.admin, client_id=client.id, data={
            'proposed_matter_title': 'Advice', 'proposed_instructions': 'Advice', 'responsible_lawyer_id': lawyer.id,
            'no_adverse_party_currently_known': True, 'no_adverse_party_explanation': 'Advice only'})
        party = check.parties.get(role='PROSPECTIVE_CLIENT')
        self.assertEqual(set([party.name, *party.aliases]), set(client_identity_names(client)))
        self.assertTrue({'Former name', 'Another name', 'Trading brand', 'Preliminary value', 'Portal Contact'} <= set(party.aliases))

    def test_automatic_search_uses_all_identity_and_party_aliases(self):
        from apps.clients.models import ConflictCheckParty
        from apps.clients.services.conflict import ClientMatterConflictService
        client = self.create('COMPANY'); check = self.accept(client)
        client.company_profile.trading_name = 'Unique trading brand'; client.company_profile.save()
        for active in [True, False]:
            candidate = Client.objects.create(firm=self.firm, full_name='Unrelated name', alternative_names='Unique trading brand', is_active=active)
            matches = ClientMatterConflictService._run_automatic_search(firm=self.firm, check=check, names_checked=['Unrelated query'], source_categories=['OTHER'])
            self.assertTrue(any(m['record_id'] == str(candidate.id) and m['record_type'] == 'client' for m in matches))
            candidate.delete()
        other = self.create(); proposal = self.accept(other)
        party = ConflictCheckParty.objects.create(conflict_check=proposal, name='Different name', role='OTHER', aliases=['Unique trading brand'])
        matches = ClientMatterConflictService._run_automatic_search(firm=self.firm, check=check, names_checked=[], source_categories=[])
        self.assertTrue(any(m['record_type'] == 'proposed_matter' and m['record_id'] == str(proposal.id) for m in matches))
        self.assertTrue(any(m['record_type'] == 'conflict_party' and m['record_id'] == str(party.id) for m in matches))

    def test_existing_prospect_token_cannot_access_business_apis_before_acceptance(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        from apps.authentication.services.auth_service import AuthService
        client = self.create(access='PORTAL_ENABLED')
        user = person('existing-portal@example.test', UserRole.PROSPECT)
        client.user = user; client.save()
        api = APIClient(); api.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(user).access_token}')
        for url, method in [
            (reverse('client-kyc-document-upload', args=[client.id]), 'post'),
            (reverse('client-documents'), 'get'),
            (reverse('client-profile'), 'put'),
            (reverse('client-cases'), 'get'),
            (reverse('communication-thread-list'), 'get'),
        ]:
            response = getattr(api, method)(url)
            self.assertEqual(response.status_code, 403, response.data)
            self.assertIn('firm acceptance', str(response.data))
        self.assertFalse(AuthService.build_session_payload(user)['user']['client']['portal_access_allowed'])
        check = self.accept(client)
        self.assertTrue(AuthService.build_session_payload(user)['user']['client']['portal_access_allowed'])
        check.acceptance_decision = 'PENDING'; check.save()
        self.assertFalse(AuthService.build_session_payload(user)['user']['client']['portal_access_allowed'])

    def test_automatic_search_covers_open_and_closed_matter_names(self):
        from apps.clients.services.conflict import ClientMatterConflictService
        client = self.create(); check = self.accept(client)
        other = Client.objects.create(firm=self.firm, full_name='Matter owner')
        for index, status in enumerate(['MATTER_OPEN', 'CLOSED']):
            matter = Case.objects.create(firm=self.firm, client=other, title='Different title',
                plaintiff=client.full_name, case_number=f'MATCH-{index}', matter_status=status)
            matches = ClientMatterConflictService._run_automatic_search(firm=self.firm, check=check, names_checked=[], source_categories=['OTHER'])
            self.assertTrue(any(m['record_type'] == 'matter' and m['record_id'] == str(matter.id) for m in matches))

    def test_another_firms_privacy_approval_cannot_enable_creation(self):
        other_admin = person('privacy-other@example.test')
        other_firm = LawFirm.objects.create(owner=other_admin, name='Other privacy firm', registration_number='PRIVACY-OTHER')
        from apps.clients.services.intake_privacy_service import transition_config
        config = IntakePrivacyConfig.active_for(self.firm)
        transition_config(firm=self.firm, user=self.admin, pk=config.pk, action='retire')
        other = IntakePrivacyConfig.objects.create(firm=other_firm, policy_version='other-v1', notice_text='Other notice', lawful_basis='LEGITIMATE_INTERESTS')
        transition_config(firm=other_firm, user=other_admin, pk=other.pk, action='activate')
        self.assertEqual(self.api.post(self.url, prospect_payload(), format='json').status_code, 400)
