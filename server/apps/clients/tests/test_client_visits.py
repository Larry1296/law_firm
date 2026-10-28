from datetime import date, timedelta
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from apps.clients.models import Client, ClientVisit
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.notifications.models import Notification
from apps.staff.models import Lawyer, Secretary
from apps.users.models import User


class ClientVisitTests(TestCase):
    def user(self, name, role=UserRole.STAFF):
        return User.objects.create_user(email=f'{name}@example.test', password='test', first_name=name,
            last_name='Person', national_id_number=name, phone_number=name, role=role)

    def setUp(self):
        self.owner = self.user('owner', UserRole.ADMIN)
        self.firm = LawFirm.objects.create(owner=self.owner, name='Firm', registration_number='VISITS')
        self.secretary = Secretary.objects.create(user=self.user('secretary'), law_firm=self.firm, staff_number='S1', date_hired=date.today())
        self.lawyer = Lawyer.objects.create(user=self.user('advocate'), law_firm=self.firm, staff_number='A1', admission_number='A1', date_hired=date.today())
        self.api = APIClient()
        self.api.force_authenticate(self.secretary.user)
        self.url = reverse('client-arrivals')

    def arrive(self):
        response = self.api.post(self.url, {'visitor_phone': '0712345678', 'visitor_name': 'Visitor', 'advocate': str(self.lawyer.pk)}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        return response.data['id']

    def action(self, pk, action, **values):
        return self.api.post(reverse('client-arrival-action', args=[pk]), {'action': action, **values}, format='json')

    def receptionist(self):
        return Secretary.objects.create(user=self.user('receptionist'), law_firm=self.firm, staff_number='R1', date_hired=date.today(), is_receptionist=True)

    def test_secretary_arrival_advocate_intake_and_closure(self):
        pk = self.arrive()
        self.assertEqual(ClientVisit.objects.get(pk=pk).intake_handler, 'ADVOCATE')
        self.assertTrue(Notification.objects.filter(recipient=self.lawyer.user, event_key=f'visit-arrived:{pk}').exists())
        self.assertEqual(self.action(pk, 'INTAKE', broad_issue='Debt').status_code, 403)
        self.assertEqual(self.action(pk, 'START').status_code, 403)
        self.api.force_authenticate(self.lawyer.user)
        self.assertEqual(self.action(pk, 'START').status_code, 200)
        self.assertEqual(self.action(pk, 'COMPLETE').status_code, 400)
        for capacity in ['Acting for my brother', 'On behalf of: ']:
            self.assertEqual(self.action(pk, 'INTAKE', broad_issue='Debt', acting_capacity=capacity).status_code, 400)
        self.assertEqual(self.action(pk, 'INTAKE', broad_issue='Debt', other_parties='Other party',
            acting_capacity='On behalf of: director of Baraka Homes Limited').status_code, 200)
        self.assertEqual(ClientVisit.objects.get(pk=pk).acting_capacity, 'On behalf of: director of Baraka Homes Limited')
        self.assertEqual(self.action(pk, 'COMPLETE', outcome='INSTRUCTING').status_code, 200)
        self.assertEqual(self.action(pk, 'START').status_code, 400)
        self.api.force_authenticate(self.secretary.user)
        row = self.api.get(self.url).data['visits'][0]
        self.assertNotIn('other_parties', row)
        self.assertEqual(row['status'], 'COMPLETED')

    def test_client_link_requires_consultation_and_preserves_existing_link(self):
        client = Client.objects.create(firm=self.firm, created_by=self.owner, full_name='Visitor Client', client_type='INDIVIDUAL')
        other = Client.objects.create(firm=self.firm, created_by=self.owner, full_name='Another Client', client_type='INDIVIDUAL')
        pk = self.arrive()
        self.assertEqual(self.action(pk, 'LINK_CLIENT', client=str(client.pk)).status_code, 400)
        self.api.force_authenticate(self.lawyer.user)
        self.assertEqual(self.action(pk, 'START').status_code, 200)
        self.assertEqual(self.action(pk, 'INTAKE', broad_issue='Debt').status_code, 200)
        self.assertEqual(self.action(pk, 'COMPLETE', outcome='INSTRUCTING').status_code, 200)
        self.assertEqual(self.action(pk, 'LINK_CLIENT', client=str(client.pk)).status_code, 403)
        self.api.force_authenticate(self.secretary.user)
        self.assertEqual(self.action(pk, 'LINK_CLIENT', client=str(client.pk)).status_code, 200)
        self.assertEqual(self.action(pk, 'LINK_CLIENT', client=str(other.pk)).status_code, 400)
        self.assertEqual(ClientVisit.objects.get(pk=pk).client_id, client.pk)

    def test_receptionist_handles_arrival_but_only_advocate_handles_consultation(self):
        receptionist = self.receptionist()
        self.api.force_authenticate(receptionist.user)
        pk = self.arrive()
        self.assertEqual(ClientVisit.objects.get(pk=pk).intake_handler, 'ADVOCATE')
        for action in ['INTAKE', 'START', 'COMPLETE']:
            self.assertEqual(self.action(pk, action, broad_issue='Debt').status_code, 403)
        self.assertEqual(self.api.post(self.url, {'visitor_phone': '0712345678', 'visitor_name': 'Visitor', 'advocate': str(self.lawyer.pk),
            'broad_issue': 'Debt'}, format='json').status_code, 400)
        self.api.force_authenticate(self.lawyer.user)
        self.assertEqual(self.action(pk, 'START').status_code, 200)
        self.assertEqual(self.action(pk, 'INTAKE', broad_issue='Debt', other_parties='Private party').status_code, 200)
        self.api.force_authenticate(receptionist.user)
        row = self.api.get(self.url).data['visits'][0]
        self.assertFalse(row['can_record_intake'])
        self.assertFalse(row['can_consult'])
        self.assertNotIn('broad_issue', row)
        self.assertNotIn('other_parties', row)
        self.assertEqual(self.action(pk, 'COMPLETE').status_code, 403)
        self.api.force_authenticate(self.lawyer.user)
        self.assertEqual(self.action(pk, 'COMPLETE', outcome='INSTRUCTING').status_code, 200)

    def test_admin_cannot_consult_for_another_advocate(self):
        pk = self.arrive()
        self.api.force_authenticate(self.owner)
        self.assertEqual(self.action(pk, 'START').status_code, 403)
        self.api.force_authenticate(self.lawyer.user)
        self.assertEqual(self.action(pk, 'START').status_code, 200)
        self.api.force_authenticate(self.owner)
        self.assertEqual(self.action(pk, 'INTAKE', broad_issue='Debt').status_code, 403)
        self.assertEqual(self.action(pk, 'COMPLETE').status_code, 403)

    def test_owner_advocate_can_consult_own_assigned_visitor(self):
        lawyer = Lawyer.objects.create(user=self.owner, law_firm=self.firm, staff_number='OWNER',
            admission_number='OWNER', date_hired=date.today(), office_location='Partner office')
        response = self.api.post(self.url, {'visitor_phone': '0712345678', 'visitor_name': 'Visitor', 'advocate': str(lawyer.pk)}, format='json')
        self.assertEqual(response.status_code, 201)
        pk = response.data['id']
        self.api.force_authenticate(self.owner)
        self.assertEqual(self.action(pk, 'START').status_code, 200)
        self.assertEqual(self.action(pk, 'INTAKE', broad_issue='Debt').status_code, 200)
        self.assertEqual(self.action(pk, 'COMPLETE', outcome='INSTRUCTING').status_code, 200)

    def test_owner_advocate_leaves_reception_to_intake_staff(self):
        lawyer = Lawyer.objects.create(user=self.owner, law_firm=self.firm, staff_number='OWNER',
            admission_number='OWNER', date_hired=date.today(), office_location='Partner office')
        self.api.force_authenticate(self.owner)
        self.assertFalse(self.api.get(self.url).data['can_receive'])
        self.assertEqual(self.api.post(self.url, {'visitor_phone': '0712345678', 'visitor_name': 'Visitor', 'advocate': str(lawyer.pk)}, format='json').status_code, 403)
        self.api.force_authenticate(self.secretary.user)
        pk = self.api.post(self.url, {'visitor_phone': '0712345678', 'visitor_name': 'Visitor', 'advocate': str(lawyer.pk)}, format='json').data['id']
        self.api.force_authenticate(self.owner)
        self.assertEqual(self.action(pk, 'CALL').status_code, 200)
        self.assertFalse(self.api.get(self.url).data['visits'][0]['can_usher'])
        self.assertEqual(self.action(pk, 'USHER').status_code, 403)
        self.secretary.can_manage_client_intake = False
        self.secretary.save(update_fields=['can_manage_client_intake'])
        self.assertTrue(self.api.get(self.url).data['can_receive'])
        self.assertEqual(self.action(pk, 'USHER').status_code, 200)

    def test_arrival_requires_kenyan_phone_and_recognises_returning_visitor(self):
        payload = {'visitor_name': 'John Mutua', 'advocate': str(self.lawyer.pk)}
        self.assertEqual(self.api.post(self.url, payload, format='json').status_code, 400)
        self.assertEqual(self.api.post(self.url, {**payload, 'visitor_phone': '12345'}, format='json').status_code, 400)
        first = self.api.post(self.url, {**payload, 'visitor_phone': '+254 722 000 111'}, format='json').data
        self.assertEqual((first['visitor_phone'], first['previous_visit_count']), ('0722000111', 0))
        client = Client.objects.create(firm=self.firm, created_by=self.owner, full_name='John Mutua', client_type='INDIVIDUAL')
        ClientVisit.objects.filter(pk=first['id']).update(client=client)
        lookup = reverse('client-arrival-visitors')
        for query in ['0722000', '254722000111', 'mutua']:
            rows = self.api.get(lookup, {'q': query}).data
            self.assertEqual([(r['visitor_phone'], r['visit_count'], r['client']) for r in rows], [('0722000111', 1, str(client.pk))], query)
        self.assertEqual(self.api.get(lookup, {'q': 'jo'}).data, [])
        second = self.api.post(self.url, {**payload, 'visitor_phone': '0722000111', 'client': str(client.pk)}, format='json').data
        self.assertEqual(second['previous_visit_count'], 1)
        self.api.force_authenticate(self.lawyer.user)
        self.assertEqual(self.api.get(lookup, {'q': 'mutua'}).status_code, 403)

    def test_advocate_directs_file_opening_at_completion(self):
        pk = self.arrive()
        self.api.force_authenticate(self.lawyer.user)
        self.action(pk, 'START')
        self.action(pk, 'INTAKE', broad_issue='Boundary dispute')
        self.assertEqual(self.action(pk, 'COMPLETE').status_code, 400)
        self.assertEqual(self.action(pk, 'COMPLETE', outcome='MAYBE').status_code, 400)
        self.assertEqual(self.action(pk, 'COMPLETE', outcome='INSTRUCTING').status_code, 200)
        self.assertTrue(Notification.objects.filter(recipient=self.secretary.user, event_key=f'visit-open-file:{pk}').exists())
        self.api.force_authenticate(self.secretary.user)
        ClientVisit.objects.filter(pk=pk).update(closed_at=timezone.now() - timedelta(days=1))
        row = self.api.get(self.url).data['visits'][0]
        self.assertEqual((row['outcome'], row['file_due'], row['file_overdue']), ('INSTRUCTING', True, True))
        client = Client.objects.create(firm=self.firm, created_by=self.owner, full_name='Visitor', client_type='INDIVIDUAL')
        self.assertEqual(self.action(pk, 'LINK_CLIENT', client=str(client.pk)).status_code, 200)
        self.assertEqual(self.api.get(self.url).data['visits'], [])

    def test_enquiry_only_visit_opens_no_file(self):
        pk = self.arrive()
        self.api.force_authenticate(self.lawyer.user)
        self.action(pk, 'START')
        self.action(pk, 'INTAKE', broad_issue='General question')
        self.assertEqual(self.action(pk, 'COMPLETE', outcome='ENQUIRY_ONLY').status_code, 200)
        self.assertFalse(Notification.objects.filter(event_key=f'visit-open-file:{pk}').exists())
        self.api.force_authenticate(self.secretary.user)
        self.assertFalse(self.api.get(self.url).data['visits'][0]['file_due'])
        client = Client.objects.create(firm=self.firm, created_by=self.owner, full_name='Visitor', client_type='INDIVIDUAL')
        self.assertEqual(self.action(pk, 'LINK_CLIENT', client=str(client.pk)).status_code, 400)

    def test_legacy_reception_intake_does_not_block_advocate(self):
        self.receptionist()
        pk = self.arrive()
        ClientVisit.objects.filter(pk=pk).update(intake_handler='RECEPTIONIST')
        self.api.force_authenticate(self.lawyer.user)
        self.assertEqual(self.action(pk, 'START').status_code, 200)
        self.assertEqual(self.action(pk, 'INTAKE', broad_issue='Debt').status_code, 200)
        self.assertEqual(ClientVisit.objects.get(pk=pk).intake_handler, 'ADVOCATE')

    def test_inactive_receptionist_and_other_firm_do_not_change_route(self):
        receptionist = self.receptionist()
        receptionist.user.is_active = False
        receptionist.user.save()
        other_owner = self.user('other-owner', UserRole.ADMIN)
        other = LawFirm.objects.create(owner=other_owner, name='Other', registration_number='OTHER')
        Secretary.objects.create(user=self.user('other-reception'), law_firm=other, staff_number='R1', date_hired=date.today(), is_receptionist=True)
        self.assertFalse(self.api.get(self.url).data['has_receptionist'])
        pk = self.arrive()
        self.assertEqual(ClientVisit.objects.get(pk=pk).intake_handler, 'ADVOCATE')
        self.api.force_authenticate(other_owner)
        self.assertEqual(self.api.get(self.url).data['visits'], [])
        self.assertEqual(self.action(pk, 'LEFT').status_code, 404)

    def test_client_and_advocate_must_belong_to_firm(self):
        owner = self.user('foreign-owner', UserRole.ADMIN)
        firm = LawFirm.objects.create(owner=owner, name='Other', registration_number='FOREIGN')
        lawyer = Lawyer.objects.create(user=self.user('foreign-lawyer'), law_firm=firm, staff_number='A2', admission_number='A2', date_hired=date.today())
        response = self.api.post(self.url, {'visitor_phone': '0712345678', 'visitor_name': 'Visitor', 'advocate': str(lawyer.pk)}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_queue_order_and_one_consultation_at_a_time(self):
        first, second = self.arrive(), self.arrive()
        self.api.force_authenticate(self.lawyer.user)
        self.assertEqual([row['id'] for row in self.api.get(self.url).data['visits']], [first, second])
        self.assertEqual(self.action(first, 'START').status_code, 200)
        self.assertEqual(self.action(second, 'START').status_code, 400)
        self.assertEqual(self.action(second, 'LEFT').status_code, 200)
        self.assertEqual(self.action(second, 'START').status_code, 400)

    def test_reject_secretary_sensitive_fields_and_unknown_fields(self):
        for field in ['broad_issue', 'intake_handler', 'status']:
            payload = {'visitor_phone': '0712345678', 'visitor_name': 'Visitor', 'advocate': str(self.lawyer.pk), field: 'Untrusted'}
            self.assertEqual(self.api.post(self.url, payload, format='json').status_code, 400)

    def test_receptionist_deactivation_does_not_strand_queue(self):
        receptionist = self.receptionist()
        pk = self.arrive()
        receptionist.is_active = False
        receptionist.save()
        self.api.force_authenticate(self.lawyer.user)
        self.assertEqual(self.action(pk, 'START').status_code, 200)
        self.assertEqual(self.action(pk, 'INTAKE', broad_issue='Debt').status_code, 200)
        self.assertEqual(self.action(pk, 'COMPLETE', outcome='INSTRUCTING').status_code, 200)

    def test_unassigned_advocate_cannot_access_visit(self):
        pk = self.arrive()
        lawyer = Lawyer.objects.create(user=self.user('second-lawyer'), law_firm=self.firm, staff_number='A2', admission_number='A2', date_hired=date.today())
        self.api.force_authenticate(lawyer.user)
        self.assertEqual(self.api.get(self.url).data['visits'], [])
        self.assertEqual(self.action(pk, 'START').status_code, 403)

    def set_office(self, lawyer=None, room='Room 201, second floor'):
        lawyer = lawyer or self.lawyer
        lawyer.office_location = room
        lawyer.save()

    def second_advocate(self):
        return Lawyer.objects.create(user=self.user('second-advocate'), law_firm=self.firm,
            staff_number='A2', admission_number='A2', date_hired=date.today(), office_location='Room 202')

    def test_ready_usher_and_live_queue_counts(self):
        self.set_office()
        first, second = self.arrive(), self.arrive()
        self.api.force_authenticate(self.lawyer.user)
        response = self.action(first, 'CALL')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['status'], 'CALLED')
        queue = self.api.get(self.url).data['queues'][0]
        self.assertEqual(queue['waiting_count'], 2)
        self.assertEqual(queue['called']['id'], first)
        self.assertEqual(queue['next']['id'], second)
        self.assertIsNone(queue['current'])
        self.assertTrue(Notification.objects.filter(recipient=self.secretary.user, event_key=f'visit-called:{first}').exists())
        self.api.force_authenticate(self.secretary.user)
        self.assertEqual(self.api.get(self.url).data['queues'][0]['office_location'], 'Room 201, second floor')
        self.assertEqual(self.action(first, 'USHER').status_code, 200)
        queue = self.api.get(self.url).data['queues'][0]
        self.assertEqual(queue['waiting_count'], 1)
        self.assertEqual(queue['current']['id'], first)
        self.assertEqual(queue['next']['id'], second)
        visit = ClientVisit.objects.get(pk=first)
        self.assertEqual(visit.called_by, self.lawyer.user)
        self.assertEqual(visit.ushered_by, self.secretary.user)
        self.assertIsNotNone(visit.called_at)
        self.api.force_authenticate(self.lawyer.user)
        self.assertEqual(self.action(second, 'CALL').status_code, 400)
        self.assertEqual(self.action(first, 'INTAKE', broad_issue='Enquiry').status_code, 200)
        self.assertEqual(self.action(first, 'COMPLETE', outcome='INSTRUCTING').status_code, 200)
        self.assertEqual(self.action(second, 'CALL').status_code, 200)

    def test_fifo_is_enforced_except_for_admin(self):
        self.set_office()
        first, second = self.arrive(), self.arrive()
        self.api.force_authenticate(self.lawyer.user)
        self.assertEqual(self.action(second, 'CALL').status_code, 400)
        self.assertEqual(self.action(second, 'START').status_code, 400)
        self.api.force_authenticate(self.owner)
        self.assertEqual(self.action(second, 'CALL').status_code, 200)
        self.assertEqual(self.action(first, 'CALL').status_code, 400)
        self.api.force_authenticate(self.secretary.user)
        self.assertEqual(self.action(second, 'USHER').status_code, 200)

    def test_call_requires_office_and_cannot_be_called_twice(self):
        pk = self.arrive()
        self.api.force_authenticate(self.lawyer.user)
        self.assertEqual(self.action(pk, 'CALL').status_code, 400)
        self.set_office()
        self.assertEqual(self.action(pk, 'CALL').status_code, 200)
        self.assertEqual(self.action(pk, 'CALL').status_code, 400)
        self.api.force_authenticate(self.secretary.user)
        self.assertEqual(self.action(pk, 'USHER').status_code, 200)
        self.assertEqual(self.action(pk, 'USHER').status_code, 403)

    def test_multiple_advocates_have_independent_queues(self):
        self.set_office()
        first = self.arrive()
        other = self.second_advocate()
        second = self.api.post(self.url, {'visitor_phone': '0712345678', 'visitor_name': 'Other visitor', 'advocate': str(other.pk)}, format='json').data['id']
        self.api.force_authenticate(self.lawyer.user)
        self.assertEqual(self.action(first, 'CALL').status_code, 200)
        self.api.force_authenticate(other.user)
        self.assertEqual(self.action(second, 'CALL').status_code, 200)
        self.assertEqual(len(self.api.get(self.url).data['queues']), 1)
        self.api.force_authenticate(self.secretary.user)
        self.assertEqual(self.api.get(self.url).data['waiting_count'], 2)
        self.assertEqual(len(self.api.get(self.url).data['queues']), 2)

    def test_assigned_secretary_scope_is_enforced_for_reads_and_writes(self):
        from apps.firm.models import FirmSetting
        self.set_office()
        first = self.arrive()
        other = self.second_advocate()
        FirmSetting.objects.update_or_create(firm=self.firm, defaults={'queue_reception_mode': 'ASSIGNED'})
        self.secretary.assigned_lawyers.add(other)
        data = self.api.get(self.url).data
        self.assertEqual(data['visits'], [])
        self.assertEqual(len(data['queues']), 1)
        self.assertEqual(self.action(first, 'LEFT').status_code, 403)
        self.assertEqual(self.api.post(self.url, {'visitor_phone': '0712345678', 'visitor_name': 'Denied', 'advocate': str(self.lawyer.pk)}, format='json').status_code, 403)
        self.api.force_authenticate(self.lawyer.user)
        self.assertEqual(self.action(first, 'CALL').status_code, 200)
        self.assertFalse(Notification.objects.filter(recipient=self.secretary.user, event_key=f'visit-called:{first}').exists())
        self.secretary.assigned_lawyers.add(self.lawyer)
        self.api.force_authenticate(self.secretary.user)
        self.assertEqual(len(self.api.get(self.url).data['queues']), 2)
        self.assertEqual(self.action(first, 'USHER').status_code, 200)

    def test_receptionist_covers_all_queues_in_assigned_mode(self):
        from apps.firm.models import FirmSetting
        receptionist = self.receptionist()
        self.second_advocate()
        FirmSetting.objects.update_or_create(firm=self.firm, defaults={'queue_reception_mode': 'ASSIGNED'})
        self.api.force_authenticate(receptionist.user)
        self.assertEqual(len(self.api.get(self.url).data['queues']), 2)
        self.assertEqual(self.action(self.arrive(), 'INTAKE', broad_issue='Enquiry').status_code, 403)

    def test_called_client_can_leave_and_next_client_can_be_called(self):
        self.set_office()
        first, second = self.arrive(), self.arrive()
        self.api.force_authenticate(self.lawyer.user)
        self.assertEqual(self.action(first, 'CALL').status_code, 200)
        self.api.force_authenticate(self.secretary.user)
        self.assertEqual(self.action(first, 'LEFT').status_code, 200)
        self.api.force_authenticate(self.lawyer.user)
        self.assertEqual(self.action(second, 'CALL').status_code, 200)

    def test_queue_configuration_updates_existing_firm_and_live_office_labels(self):
        self.set_office()
        pk = self.arrive()
        self.api.force_authenticate(self.lawyer.user)
        self.assertEqual(self.action(pk, 'CALL').status_code, 200)
        url = reverse('queue-configuration')
        self.assertEqual(self.api.patch(url, {}, format='json').status_code, 403)
        self.api.force_authenticate(self.owner)
        response = self.api.patch(url, {
            'reception_mode': 'ASSIGNED',
            'offices': [{'advocate': str(self.lawyer.pk), 'office_location': 'Room 305'}],
            'secretary_assignments': [{'secretary': str(self.secretary.pk), 'advocates': [str(self.lawyer.pk)]}],
        }, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.api.force_authenticate(self.secretary.user)
        queue = self.api.get(self.url).data['queues'][0]
        self.assertEqual(queue['office_location'], 'Room 305')
        self.assertEqual(queue['called']['office_location'], 'Room 305')

    def test_configuration_foreign_advocate_rolls_back_all_changes(self):
        self.api.force_authenticate(self.owner)
        response = self.api.patch(reverse('queue-configuration'), {
            'offices': [
                {'advocate': str(self.lawyer.pk), 'office_location': 'Wrong room'},
                {'advocate': '00000000-0000-0000-0000-000000000000', 'office_location': 'Other room'},
            ],
        }, format='json')
        self.assertEqual(response.status_code, 404)
        self.lawyer.refresh_from_db()
        self.assertFalse(self.lawyer.office_location)

    def test_database_prevents_overlapping_called_or_consulting_visits(self):
        from django.db import IntegrityError, transaction
        first, second = self.arrive(), self.arrive()
        ClientVisit.objects.filter(pk=first).update(status='CALLED')
        with self.assertRaises(IntegrityError), transaction.atomic():
            ClientVisit.objects.filter(pk=second).update(status='IN_CONSULTATION')

    def test_shared_reception_sees_admin_and_two_advocates(self):
        other = self.second_advocate()
        owner_lawyer = Lawyer.objects.create(user=self.owner, law_firm=self.firm, staff_number='A3',
            admission_number='A3', date_hired=date.today(), office_location='Managing partner office')
        data = self.api.get(self.url).data
        self.assertEqual(len(data['queues']), 3)
        for lawyer in [self.lawyer, other, owner_lawyer]:
            response = self.api.post(self.url, {'visitor_phone': '0712345678', 'visitor_name': lawyer.user.first_name, 'advocate': str(lawyer.pk)}, format='json')
            self.assertEqual(response.status_code, 201)
        data = self.api.get(self.url).data
        self.assertEqual(data['waiting_count'], 3)
        self.assertEqual([row['waiting_count'] for row in data['queues']], [1, 1, 1])

    def test_office_cannot_be_removed_while_client_is_called(self):
        self.set_office()
        pk = self.arrive()
        self.api.force_authenticate(self.owner)
        self.assertEqual(self.action(pk, 'CALL').status_code, 200)
        response = self.api.patch(reverse('queue-configuration'), {
            'offices': [{'advocate': str(self.lawyer.pk), 'office_location': ''}],
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.lawyer.refresh_from_db()
        self.assertEqual(self.lawyer.office_location, 'Room 201, second floor')
