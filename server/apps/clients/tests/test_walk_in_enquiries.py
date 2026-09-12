from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timezone as dt_timezone
from threading import Barrier
from unittest.mock import patch

from django.db import close_old_connections, transaction, IntegrityError
from django.test import TestCase, TransactionTestCase, skipUnlessDBFeature
from django.urls import reverse
from rest_framework.test import APIClient

from apps.audit_logs.models import AuditEvent
from apps.clients.models import WalkInEnquiry, WalkInEnquirySequence
from apps.clients.services.walk_in_enquiry_service import WalkInEnquiryService
from apps.firm.models import LawFirm
from apps.staff.models import Accountant, HR, IT, Lawyer, Secretary, SecretaryPermission, SecretaryPermissionGrant
from apps.users.models import User


def user(number, role='ADMIN'):
    return User.objects.create_user(email=f'enquiry-{number}@example.com', password='test-pass',
        first_name='Receiving', last_name=str(number), phone_number=f'+25470000{number:04}',
        national_id_number=f'ENQ-{number}', role=role)


def payload(**overrides):
    return dict(received_at='2026-09-12T09:30:00+03:00', visitor_name='Jane Visitor',
        safe_contact='Call +254700123456 after 5pm', visitor_type='INDIVIDUAL',
        service_category='Employment', related_party_names=['  ABC Limited  ', '', '   ', 'John Doe'],
        description='Employment enquiry', privacy_acknowledged=True, **overrides)


class WalkInEnquiryTests(TestCase):
    def setUp(self):
        self.admin = user(1)
        self.firm = LawFirm.objects.create(owner=self.admin, name='Enquiry Firm', registration_number='ENQ-F1')
        self.other_admin = user(2)
        self.other_firm = LawFirm.objects.create(owner=self.other_admin, name='Other Firm', registration_number='ENQ-F2')
        self.secretary_user = user(3, 'STAFF')
        self.secretary = Secretary.objects.create(user=self.secretary_user, law_firm=self.firm,
            staff_number='SEC-1', date_hired=date(2026, 1, 1))
        self.grant = SecretaryPermissionGrant.objects.create(secretary=self.secretary, code=SecretaryPermission.MANAGE_CLIENTS)
        self.api = APIClient()
        self.api.force_authenticate(self.admin)
        self.url = reverse('admin-walk-in-enquiries')
        self.secretary_url = reverse('secretary-walk-in-enquiries')

    def post(self, data=None, url=None):
        return self.api.post(url or self.url, payload() if data is None else data, format='json')

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
        for field in ['received_at', 'visitor_name', 'safe_contact', 'visitor_type', 'service_category', 'description', 'privacy_acknowledged']:
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
        data = payload(); data['visitor_type'] = 'ORGANISATION_REPRESENTATIVE'
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
        self.assertEqual(set(event.new_values), {'reference', 'status', 'visitor_type', 'service_category', 'urgency_type', 'critical_date'})
        self.assertNotIn('Jane Visitor', str(event.new_values))
        before = WalkInEnquirySequence.objects.get().next_number
        with patch('apps.clients.services.walk_in_enquiry_service.AuditService.record', side_effect=RuntimeError('audit failed')):
            with self.assertRaises(RuntimeError):
                WalkInEnquiryService.create(user=self.admin, data=payload())
        self.assertEqual(WalkInEnquiry.objects.count(), 1)
        self.assertEqual(WalkInEnquirySequence.objects.get().next_number, before)

    def test_newest_received_first(self):
        for received in ['2026-09-10T12:00:00+03:00', '2026-09-12T12:00:00+03:00', '2026-09-11T12:00:00+03:00']:
            data = payload(); data['received_at'] = received
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
        LawFirm.objects.create(owner=owner, name='Concurrent Firm', registration_number='ENQ-CONCURRENT')
        barrier = Barrier(2)

        def record(_):
            close_old_connections()
            try:
                actor = User.objects.get(pk=owner.pk)
                barrier.wait(timeout=10)
                return WalkInEnquiryService.create(user=actor, data=payload()).reference
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as executor:
            references = list(executor.map(record, range(2)))
        self.assertEqual(len(set(references)), 2)
        self.assertEqual(sorted(ref[-5:] for ref in references), ['00001', '00002'])
        self.assertEqual(AuditEvent.objects.filter(action='WALK_IN_ENQUIRY_RECORDED').count(), 2)
