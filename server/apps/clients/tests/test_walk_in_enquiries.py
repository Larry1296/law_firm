from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timezone as dt_timezone
from threading import Barrier
from unittest.mock import patch

from django.db import close_old_connections, transaction, IntegrityError
from django.test import TestCase, TransactionTestCase, skipUnlessDBFeature
from django.urls import reverse
from rest_framework.test import APIClient

from apps.audit_logs.models import AuditEvent
from apps.clients.models import WalkInEnquiry, WalkInEnquirySequence, WalkInPrivacyConfig, WalkInEnquiryCorrection, WalkInNoticeDelivery
from apps.clients.services.walk_in_privacy_service import privacy_notice
from apps.clients.services.walk_in_enquiry_service import WalkInEnquiryService
from apps.firm.models import LawFirm
from apps.staff.models import Accountant, HR, IT, Lawyer, Secretary, SecretaryPermission, SecretaryPermissionGrant
from apps.users.models import User


def user(number, role='ADMIN'):
    return User.objects.create_user(email=f'enquiry-{number}@example.com', password='test-pass',
        first_name='Receiving', last_name=str(number), phone_number=f'+25470000{number:04}',
        national_id_number=f'ENQ-{number}', role=role)


def payload(**overrides):
    return {
        'enquiry_for': 'SELF', 'authority_status': 'NOT_REQUIRED', 'visitor_name': 'Jane Visitor',
        'safe_contact': 'Call +254700123456 after 5pm', 'visitor_type': 'INDIVIDUAL',
        'service_category': 'Employment', 'related_party_names': ['  ABC Limited  ', '', '   ', 'John Doe'],
        'description': 'Employment enquiry', 'privacy_acknowledged': True, **overrides,
    }


def configure(firm):
    firm.email = 'privacy@example.com'
    firm.phone_number = '+254700000000'
    firm.physical_address = 'Test office, Nairobi'
    firm.save()
    return WalkInPrivacyConfig.objects.create(firm=firm, approved_by=firm.owner,
        policy_version='test-v1', lawful_basis='LEGITIMATE_INTERESTS',
        lawful_basis_explanation='Test policy: minimal intake, subject to rights assessment, including representative enquiries.',
        mandatory_legal_requirement='No legal obligation to supply this intake information.',
        recipients='Authorised intake staff and contracted hosting provider under confidentiality obligations.',
        retention='Test policy only: delete or anonymise after 90 days unless a lawful hold applies.',
        privacy_contact='Privacy lead: privacy@example.com', transfers='Test deployment: no overseas transfers.',
        safeguards='Restricted roles, firm isolation and controlled correction history; hosting controls require review.')


def receipt(actor):
    firm = WalkInEnquiryService.firm_for(actor)
    return str(WalkInEnquiryService.deliver_notice(user=actor, data={
        'version': privacy_notice(firm)['notice']['version'], 'method': 'SCREEN', 'acknowledged': True,
    }).pk)


class WalkInEnquiryTests(TestCase):
    def setUp(self):
        self.admin = user(1)
        self.firm = LawFirm.objects.create(owner=self.admin, name='Enquiry Firm', registration_number='ENQ-F1')
        self.other_admin = user(2)
        self.other_firm = LawFirm.objects.create(owner=self.other_admin, name='Other Firm', registration_number='ENQ-F2')
        configure(self.firm)
        configure(self.other_firm)
        self.secretary_user = user(3, 'STAFF')
        self.secretary = Secretary.objects.create(user=self.secretary_user, law_firm=self.firm,
            staff_number='SEC-1', date_hired=date(2026, 1, 1))
        self.grant = SecretaryPermissionGrant.objects.create(secretary=self.secretary, code=SecretaryPermission.MANAGE_CLIENTS)
        self.api = APIClient()
        self.api.force_authenticate(self.admin)
        self.url = reverse('admin-walk-in-enquiries')
        self.secretary_url = reverse('secretary-walk-in-enquiries')

    def post(self, data=None, url=None):
        data = payload() if data is None else data.copy()
        actor = self.api.handler._force_user
        try:
            data.setdefault('notice_receipt', receipt(actor))
        except Exception:
            pass  # Rejection tests intentionally use unauthorised actors.
        return self.api.post(url or self.url, data, format='json')

    def test_reference_sequence_and_admin_access(self):
        with patch('apps.clients.services.walk_in_enquiry_service.timezone.now', return_value=datetime(2026, 1, 1, tzinfo=dt_timezone.utc)):
            first, second = self.post(), self.post()
        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(first.data['reference'], 'ENQ-2026-00001')
        self.assertEqual(second.data['reference'], 'ENQ-2026-00002')
        self.assertEqual(first.data['status'], 'RECEIVED_AWAITING_REVIEW')
        self.assertEqual(first.data['status_label'], 'Received — awaiting preliminary review')
        self.assertEqual(first.data['received_by_name'], self.admin.full_name)
        self.assertEqual(first.data['related_party_names'], ['ABC Limited', 'John Doe'])
        self.assertEqual(len(self.api.get(self.url).data['enquiries']), 2)

    def test_per_firm_and_nairobi_calendar_year_sequences(self):
        for instant, actor, expected in [
            ('2026-12-31T20:59:00+00:00', self.admin, 'ENQ-2026-00001'),
            ('2026-12-31T21:00:00+00:00', self.admin, 'ENQ-2027-00001'),
            ('2026-12-31T21:00:00+00:00', self.other_admin, 'ENQ-2027-00001'),
            ('2027-01-01T09:00:00+00:00', self.admin, 'ENQ-2027-00002'),
        ]:
            self.api.force_authenticate(actor)
            with patch('apps.clients.services.walk_in_enquiry_service.timezone.now', return_value=datetime.fromisoformat(instant)):
                response = self.post()
            self.assertEqual(response.status_code, 201, response.data)
            self.assertEqual(response.data['reference'], expected)

    def test_required_fields(self):
        for field in ['visitor_name', 'safe_contact', 'enquiry_for', 'authority_status', 'service_category', 'description', 'privacy_acknowledged']:
            for missing in [True, False]:
                with self.subTest(field=field, missing=missing):
                    data = payload()
                    if missing:
                        data.pop(field)
                    else:
                        data[field] = ''
                    response = self.post(data)
                    self.assertEqual(response.status_code, 400, response.data)
                    self.assertIn(field, response.data['errors'])
        self.assertFalse(WalkInEnquiry.objects.exists())
        self.assertFalse(WalkInEnquirySequence.objects.exists())

    def test_description_limit_dates_and_privacy(self):
        for field, value in [('description', 'a' * 501), ('description', '   '), ('privacy_acknowledged', False), ('received_at', 'not a date'), ('critical_date', '2026-02-30')]:
            with self.subTest(field=field):
                data = payload(); data[field] = value
                response = self.post(data)
                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.data['errors'])
        data = payload(); data.update(description='a' * 500, critical_date='2026-10-01')
        self.assertEqual(self.post(data).status_code, 201)

    def test_conditional_organisation_and_urgency_validation(self):
        data = payload(); data.update(enquiry_for='ORGANISATION', authority_status='CLAIMED', visitor_capacity='Director')
        self.assertIn('organisation_name', self.post(data).data['errors'])
        data['organisation_name'] = 'Organisation'
        for urgency in WalkInEnquiry.UrgencyType.values[1:]:
            data.update(urgency_type=urgency, urgency_note=' ')
            self.assertIn('urgency_note', self.post(data).data['errors'])
            data['urgency_note'] = 'Date approaching'
            self.assertEqual(self.post(data).status_code, 201)

    def test_firm_and_server_fields_cannot_be_overridden(self):
        data = payload(); data.update(firm=str(self.other_firm.pk), received_by=str(self.other_admin.pk),
            reference='ENQ-2026-99999', status='CONVERTED')
        response = self.post(data)
        self.assertEqual(response.status_code, 201)
        enquiry = WalkInEnquiry.objects.get(pk=response.data['id'])
        self.assertEqual(enquiry.firm, self.firm)
        self.assertEqual(enquiry.received_by, self.admin)
        self.assertEqual(enquiry.status, 'RECEIVED_AWAITING_REVIEW')
        self.api.force_authenticate(self.other_admin)
        self.assertEqual(self.api.get(self.url, {'firm': self.firm.pk}).data['enquiries'], [])
        self.post()
        self.api.force_authenticate(self.secretary_user)
        rows = self.api.get(self.secretary_url, {'firm': self.other_firm.pk}).data['enquiries']
        self.assertEqual([row['id'] for row in rows], [str(enquiry.pk)])

    def test_secretary_access_and_authority_enforcement(self):
        self.api.force_authenticate(self.secretary_user)
        self.assertEqual(self.post(url=self.secretary_url).status_code, 201)
        self.assertEqual(self.api.get(self.secretary_url).status_code, 200)
        for model, field in [(self.secretary, 'is_active'), (self.secretary, 'can_manage_client_intake'), (self.grant, 'is_active'), (self.secretary_user, 'is_active')]:
            setattr(model, field, False); model.save()
            # Refresh the reverse one-to-one cached by permission resolution.
            self.api.force_authenticate(User.objects.get(pk=self.secretary_user.pk))
            for url in [self.url, self.secretary_url]:
                self.assertEqual(self.post(url=url).status_code, 403)
                self.assertEqual(self.api.get(url).status_code, 403)
            setattr(model, field, True); model.save()

    def test_unauthorised_roles_and_missing_profiles(self):
        for index, role in enumerate(['OFFICIAL_CLIENT', 'PROSPECT', 'STAFF', 'ADMIN'], 10):
            self.api.force_authenticate(user(index, role))
            for url in [self.url, self.secretary_url]:
                self.assertEqual(self.post(url=url).status_code, 403)
                self.assertEqual(self.api.get(url).status_code, 403)

    def test_other_staff_profiles_are_denied(self):
        for index, profile in enumerate([Lawyer, Accountant, HR, IT], 30):
            actor = user(index, 'STAFF')
            profile.objects.create(user=actor, law_firm=self.firm,
                staff_number=f'STAFF-{index}', date_hired=date(2026, 1, 1),
                **({'admission_number': f'ADM-{index}'} if profile is Lawyer else {}))
            self.api.force_authenticate(actor)
            self.assertEqual(self.post().status_code, 403)
            self.assertEqual(self.api.get(self.secretary_url).status_code, 403)

    def test_audit_is_safe_and_atomic(self):
        response = self.post()
        event = AuditEvent.objects.get(action='WALK_IN_ENQUIRY_RECORDED')
        self.assertEqual(event.object_identifier, response.data['id'])
        self.assertEqual(event.user, self.admin)
        self.assertEqual(event.firm, self.firm)
        self.assertEqual(set(event.new_values), {'revision', 'received_time_overridden'})
        self.assertNotIn('Jane Visitor', str(event.new_values))
        before = WalkInEnquirySequence.objects.get().next_number
        valid_data = payload(notice_receipt=receipt(self.admin))
        with patch('apps.clients.services.walk_in_enquiry_service.AuditService.record', side_effect=RuntimeError('audit failed')):
            with self.assertRaises(RuntimeError):
                WalkInEnquiryService.create(user=self.admin, data=valid_data)
        self.assertEqual(WalkInEnquiry.objects.count(), 1)
        self.assertEqual(WalkInEnquirySequence.objects.get().next_number, before)

    @patch('apps.clients.services.walk_in_enquiry_service.timezone.now', return_value=datetime(2026, 9, 13, tzinfo=dt_timezone.utc))
    def test_newest_received_first(self, _now):
        for received in ['2026-09-10T12:00:00+03:00', '2026-09-12T12:00:00+03:00', '2026-09-11T12:00:00+03:00']:
            data = payload(); data.update(received_at=received, received_at_reason='Delayed register entry')
            self.post(data)
        rows = self.api.get(self.url).data['enquiries']
        self.assertEqual([row['received_at'][:10] for row in rows], ['2026-09-12', '2026-09-11', '2026-09-10'])

    def test_database_reference_uniqueness(self):
        self.post()
        enquiry = WalkInEnquiry.objects.get()
        enquiry.pk = None
        with self.assertRaises(IntegrityError), transaction.atomic():
            enquiry.save(force_insert=True)

    def test_no_update_delete_or_upload_operation(self):
        self.assertEqual(self.api.patch(self.url, {}, format='json').status_code, 405)
        self.assertEqual(self.api.delete(self.url).status_code, 405)
        self.assertEqual(self.api.post(self.url, {}, format='multipart').status_code, 415)


class WalkInEnquiryConcurrencyTests(TransactionTestCase):
    @skipUnlessDBFeature('has_select_for_update')
    def test_concurrent_first_requests_allocate_distinct_references(self):
        owner = user(90)
        firm = LawFirm.objects.create(owner=owner, name='Concurrent Firm', registration_number='ENQ-CONCURRENT')
        configure(firm)
        barrier = Barrier(2)

        def record(_):
            close_old_connections()
            try:
                actor = User.objects.get(pk=owner.pk)
                data = payload(notice_receipt=receipt(actor))
                barrier.wait(timeout=10)
                return WalkInEnquiryService.create(user=actor, data=data).reference
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as executor:
            references = list(executor.map(record, range(2)))
        self.assertEqual(len(set(references)), 2)
        self.assertEqual(sorted(ref[-5:] for ref in references), ['00001', '00002'])
        self.assertEqual(AuditEvent.objects.filter(action='WALK_IN_ENQUIRY_RECORDED').count(), 2)


class WalkInCaptureSafeguardTests(TestCase):
    setUp = WalkInEnquiryTests.setUp
    post = WalkInEnquiryTests.post
    def correction_url(self, enquiry_id, workspace='admin'):
        return reverse(f'{workspace}-walk-in-corrections', args=[enquiry_id])

    def test_role_specific_endpoints(self):
        for actor, wrong in [(self.secretary_user, 'admin'), (self.admin, 'secretary')]:
            self.api.force_authenticate(actor)
            for suffix in ['enquiries', 'privacy-notice', 'notice-deliveries']:
                name = f'{wrong}-walk-in-{suffix}'
                url = reverse(name)
                self.assertEqual(self.api.get(url).status_code, 403)
                self.assertEqual(self.api.post(url, {}, format='json').status_code, 403)

    def test_privacy_configuration_blocks_creation_but_not_register(self):
        WalkInPrivacyConfig.objects.filter(firm=self.firm).delete()
        response = self.api.get(reverse('admin-walk-in-privacy-notice'))
        self.assertFalse(response.data['ready'])
        self.assertEqual(self.api.get(self.url).status_code, 200)
        self.assertEqual(self.api.post(self.url, payload(), format='json').status_code, 400)
        configure(self.firm)
        self.firm.email = ''; self.firm.save()
        self.assertFalse(privacy_notice(self.firm)['ready'])

    def test_notice_delivery_required_single_use_and_persisted(self):
        self.assertEqual(self.api.post(self.url, payload(), format='json').status_code, 400)
        token = receipt(self.admin)
        delivered = WalkInNoticeDelivery.objects.get(pk=token)
        data = payload(notice_receipt=token)
        result = self.api.post(self.url, data, format='json')
        self.assertEqual(result.status_code, 201, result.data)
        enquiry = WalkInEnquiry.objects.get(pk=result.data['id'])
        self.assertEqual(enquiry.notice_version, delivered.version)
        self.assertEqual(enquiry.notice_snapshot, delivered.snapshot)
        self.assertEqual(enquiry.notice_delivery_method, 'SCREEN')
        self.assertEqual(enquiry.notice_delivered_at, delivered.delivered_at)
        self.assertLessEqual(enquiry.notice_delivered_at, enquiry.created_at)
        self.assertEqual(self.api.post(self.url, data, format='json').status_code, 400)
        self.assertNotIn('consent', result.data)
        self.assertEqual(enquiry.notice_snapshot['lawful_basis'], 'LEGITIMATE_INTERESTS')
        self.assertEqual(self.post(payload(consent=True)).status_code, 400)

    def test_stale_tampered_expired_and_other_actor_receipts_rejected(self):
        token = receipt(self.admin)
        self.firm.phone_number = '+254700009999'; self.firm.save()
        self.assertEqual(self.api.post(self.url, payload(notice_receipt=token), format='json').status_code, 400)
        token = receipt(self.admin)
        from django.utils import timezone
        from datetime import timedelta
        WalkInNoticeDelivery.objects.filter(pk=token).update(delivered_at=timezone.now() - timedelta(days=2))
        self.assertEqual(self.api.post(self.url, payload(notice_receipt=token), format='json').status_code, 400)
        token = receipt(self.other_admin)
        self.assertEqual(self.api.post(self.url, payload(notice_receipt=token), format='json').status_code, 400)
        token = receipt(self.admin)
        self.api.force_authenticate(self.secretary_user)
        self.assertEqual(self.api.post(self.secretary_url, payload(notice_receipt=token), format='json').status_code, 400)

    def test_notice_delivery_requires_acknowledgement_and_valid_method(self):
        url = reverse('admin-walk-in-notice-deliveries')
        version = privacy_notice(self.firm)['notice']['version']
        for data in [{'version': version, 'method': 'SCREEN', 'acknowledged': False},
                     {'version': version, 'method': 'EMAIL', 'acknowledged': True},
                     {'version': 'wrong', 'method': 'SCREEN', 'acknowledged': True}]:
            self.assertEqual(self.api.post(url, data, format='json').status_code, 400)
        self.assertEqual(WalkInNoticeDelivery.objects.count(), 0)

    def test_self_person_and_organisation_conditions(self):
        self.assertEqual(self.post().status_code, 201)
        person = payload(enquiry_for='OTHER', prospective_person_name='Test Beneficiary',
                         visitor_capacity='Sibling', authority_status='PENDING')
        for field in ['prospective_person_name', 'visitor_capacity', 'authority_status']:
            invalid = person.copy(); invalid[field] = ''
            self.assertEqual(self.post(invalid).status_code, 400)
        for state in ['CLAIMED', 'CONFIRMED', 'PENDING']:
            self.assertEqual(self.post({**person, 'authority_status': state}).status_code, 201)
        self.assertEqual(self.post({**person, 'authority_status': 'NOT_REQUIRED'}).status_code, 400)
        self.assertEqual(self.post(payload(authority_status='CLAIMED')).status_code, 400)
        org = {**person, 'enquiry_for': 'ORGANISATION', 'organisation_name': 'Test Org'}
        response = self.post(org)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['prospective_person_name'], '')
        self.assertEqual(response.data['visitor_type'], 'ORGANISATION_REPRESENTATIVE')

    def test_server_time_and_backdate_reason_and_future_rejection(self):
        instant = datetime(2026, 9, 13, 12, tzinfo=dt_timezone.utc)
        with patch('apps.clients.services.walk_in_enquiry_service.timezone.now', return_value=instant):
            response = self.post()
            self.assertEqual(WalkInEnquiry.objects.get(pk=response.data['id']).received_at, instant)
            self.assertEqual(self.post(payload(received_at='2026-09-12T09:00:00Z')).status_code, 400)
            response = self.post(payload(received_at='2026-09-12T09:00:00Z', received_at_reason='Delayed capture'))
            self.assertEqual(response.status_code, 201, response.data)
            self.assertTrue(AuditEvent.objects.filter(action='WALK_IN_RECEIVED_TIME_OVERRIDDEN').exists())
            response = self.post(payload(received_at='2026-09-14T09:00:00Z', received_at_reason='Clock mistake'))
            self.assertEqual(response.status_code, 400)

    def test_controlled_corrections_history_and_immutable_notice(self):
        enquiry = self.post().data
        url = self.correction_url(enquiry['id'])
        for body in [{}, {'reason': ' ', 'revision': 0, 'changes': {'visitor_name': 'Corrected'}},
                     {'reason': 'Correction', 'revision': 0, 'changes': {'notice_version': 'fake'}}]:
            self.assertEqual(self.api.post(url, body, format='json').status_code, 400)
        body = {'reason': 'Visitor clarified spelling', 'revision': 0, 'changes': {'visitor_name': 'Jane Corrected'}}
        response = self.api.post(url, body, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['revision'], 1)
        history = self.api.get(url).data['corrections'][0]
        self.assertEqual(history['previous_values']['visitor_name'], 'Jane Visitor')
        self.assertEqual(history['replacement_values']['visitor_name'], 'Jane Corrected')
        self.assertEqual(history['actor_name'], self.admin.full_name)
        self.assertEqual(history['reason'], body['reason'])
        self.assertTrue(history['recorded_at'])
        self.assertEqual(self.api.post(url, body, format='json').status_code, 400)  # stale revision
        record = WalkInEnquiry.objects.get(pk=enquiry['id'])
        self.assertEqual(record.notice_version, enquiry['notice_version'])
        audit = AuditEvent.objects.get(action='WALK_IN_ENQUIRY_CORRECTED')
        self.assertNotIn('Jane', str(audit.new_values))
        self.assertEqual(audit.reason, '')
        self.assertEqual(self.api.delete(url).status_code, 405)
        self.assertEqual(self.api.patch(url, {}, format='json').status_code, 405)

    def test_correction_permissions_and_cross_firm_history(self):
        enquiry = self.post().data
        body = {'reason': 'Correct spelling', 'revision': 0, 'changes': {'visitor_name': 'Corrected'}}
        self.api.force_authenticate(self.secretary_user)
        url = self.correction_url(enquiry['id'], 'secretary')
        self.assertEqual(self.api.get(url).status_code, 200)
        self.assertEqual(self.api.post(url, body, format='json').status_code, 403)
        self.api.force_authenticate(self.other_admin)
        url = self.correction_url(enquiry['id'])
        self.assertEqual(self.api.get(url).status_code, 404)
        self.assertEqual(self.api.post(url, body, format='json').status_code, 404)

    def test_correction_rolls_back_if_audit_fails_and_no_sensitive_logging(self):
        enquiry = self.post().data
        url = self.correction_url(enquiry['id'])
        with patch('apps.clients.services.walk_in_enquiry_service.AuditService.record', side_effect=RuntimeError('Jane sensitive contact')):
            with self.assertLogs('apps.clients.views.walk_in_enquiry_view', level='ERROR') as logs:
                result = self.api.post(url, {'reason': 'Secret reason', 'revision': 0,
                    'changes': {'visitor_name': 'Sensitive replacement'}}, format='json')
        self.assertEqual(result.status_code, 500)
        self.assertNotIn('Jane', str(logs.output))
        self.assertNotIn('Secret reason', str(logs.output))
        self.assertEqual(WalkInEnquiryCorrection.objects.count(), 0)
        self.assertEqual(WalkInEnquiry.objects.get(pk=enquiry['id']).visitor_name, 'Jane Visitor')

    def test_notice_configuration_owner_only_and_version_changes(self):
        url = reverse('admin-walk-in-privacy-notice')
        current = self.api.get(url).data
        config = current['configuration']
        self.assertEqual(self.api.put(url, config, format='json').status_code, 400)
        config['policy_version'] = 'test-v2'
        result = self.api.put(url, config, format='json')
        self.assertEqual(result.status_code, 200, result.data)
        self.assertNotEqual(result.data['notice']['version'], current['notice']['version'])
        self.api.force_authenticate(self.secretary_user)
        self.assertEqual(self.api.put(reverse('secretary-walk-in-privacy-notice'), config, format='json').status_code, 403)

    def test_all_configured_notice_sections_and_delivery_methods(self):
        response = self.api.get(reverse('admin-walk-in-privacy-notice'))
        notice = response.data['notice']
        text = ' '.join(section['text'] for section in notice['sections'])
        for value in [self.firm.name, self.firm.email, self.firm.phone_number, self.firm.physical_address]:
            self.assertIn(value, text)
        for key, value in response.data['configuration'].items():
            if key not in ['policy_version', 'lawful_basis']:
                self.assertIn(value, text)
        for title in ['Collection and purpose', 'Lawful basis', 'Required and optional information',
                      'Consequences of not providing information', 'Recipients and sharing', 'Security and safeguards',
                      'Retention', 'Transfers outside Kenya', 'Your rights', 'Privacy contact', 'Complaints',
                      'Acknowledgement is not consent']:
            self.assertIn(title, [section['title'] for section in notice['sections']])
        for method in ['SCREEN', 'READ_ALOUD', 'PAPER']:
            delivery = self.api.post(reverse('admin-walk-in-notice-deliveries'), {
                'version': notice['version'], 'method': method, 'acknowledged': True,
            }, format='json')
            self.assertEqual(delivery.status_code, 201)
            created = self.api.post(self.url, payload(notice_receipt=delivery.data['id']), format='json')
            self.assertEqual(created.status_code, 201)
            self.assertEqual(created.data['notice_delivery_method'], method)

    def test_wrong_version_and_forged_notice_evidence(self):
        token = receipt(self.admin)
        WalkInNoticeDelivery.objects.filter(pk=token).update(version='wrong')
        self.assertEqual(self.api.post(self.url, payload(notice_receipt=token), format='json').status_code, 400)
        created = self.post(payload(notice_version='forged', notice_snapshot={'consent': True},
                                    notice_delivered_at='2000-01-01T00:00:00Z', notice_delivery_method='EMAIL'))
        self.assertEqual(created.status_code, 201)
        self.assertNotEqual(created.data['notice_version'], 'forged')
        self.assertNotIn('consent', created.data['notice_snapshot'])
        config = self.api.get(reverse('admin-walk-in-privacy-notice')).data['configuration']
        config.update(policy_version='v2', retention='A different approved retention policy')
        self.api.put(reverse('admin-walk-in-privacy-notice'), config, format='json')
        record = WalkInEnquiry.objects.get(pk=created.data['id'])
        self.assertEqual(record.notice_snapshot, created.data['notice_snapshot'])

    def test_time_correction_reason_future_rejection_and_two_revisions(self):
        enquiry = self.post().data
        url = self.correction_url(enquiry['id'])
        body = {'revision': 0, 'reason': 'Correct receipt time', 'changes': {'received_at': '2999-01-01T00:00:00Z'}}
        self.assertEqual(self.api.post(url, body, format='json').status_code, 400)
        body['changes']['received_at'] = '2026-01-01T00:00:00Z'
        result = self.api.post(url, body, format='json')
        self.assertEqual(result.status_code, 200, result.data)
        self.assertEqual(result.data['received_at_reason'], 'Correct receipt time')
        result = self.api.post(url, {'revision': 1, 'reason': 'Correct service category',
            'changes': {'service_category': 'Family'}}, format='json')
        self.assertEqual(result.status_code, 200)
        history = self.api.get(url).data['corrections']
        self.assertEqual([row['revision'] for row in history], [2, 1])
        self.assertIn('received_at', history[1]['previous_values'])
        self.assertEqual(history[0]['previous_values']['service_category'], 'Employment')
        self.assertEqual(history[0]['replacement_values']['service_category'], 'Family')

    def test_sensitive_values_excluded_from_all_enquiry_audit_metadata(self):
        secret = 'PRIVATE-TEST-VALUE'
        created = self.post(payload(visitor_name=secret, description=secret, service_category=secret,
                                    safe_contact=secret, referral_source=secret, related_party_names=[secret]))
        self.api.post(self.correction_url(created.data['id']), {'revision': 0, 'reason': secret,
            'changes': {'visitor_name': secret + '-corrected'}}, format='json')
        for event in AuditEvent.objects.all():
            self.assertNotIn(secret, str(event.new_values))
            self.assertNotIn(secret, str(event.previous_values))
            self.assertNotIn(secret, event.reason)


class WalkInReceiptConcurrencyTests(TransactionTestCase):
    @skipUnlessDBFeature('has_select_for_update')
    def test_same_receipt_is_single_use_under_concurrency(self):
        from rest_framework.exceptions import ValidationError
        owner = user(91)
        firm = LawFirm.objects.create(owner=owner, name='Single Use Firm', registration_number='ENQ-SINGLE')
        configure(firm)
        token = receipt(owner)
        barrier = Barrier(2)

        def record(_):
            close_old_connections()
            try:
                actor = User.objects.get(pk=owner.pk)
                barrier.wait(timeout=10)
                try:
                    WalkInEnquiryService.create(user=actor, data=payload(notice_receipt=token))
                    return 'created'
                except ValidationError:
                    return 'rejected'
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as executor:
            outcomes = list(executor.map(record, range(2)))
        self.assertCountEqual(outcomes, ['created', 'rejected'])
        self.assertEqual(WalkInEnquiry.objects.count(), 1)
        self.assertEqual(AuditEvent.objects.filter(action='WALK_IN_ENQUIRY_RECORDED').count(), 1)
