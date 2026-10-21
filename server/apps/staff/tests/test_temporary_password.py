from unittest.mock import patch

from django.core import mail
from django.urls import reverse

from apps.clients.models import Client
from apps.firm.models import LawFirm
from apps.staff.tests.test_staff_sign_in_link import StaffSignInLinkTests


class TemporaryPasswordTests(StaffSignInLinkTests):
    def send(self, **payload):
        return self.client.post(reverse('admin-temporary-password'), payload, format='json')

    def test_staff_password_is_replaced_and_emailed(self):
        response = self.send(email=self.staff.email)
        self.assertEqual(response.status_code, 200, response.data)
        password = mail.outbox[-1].body.split('Temporary password: ')[1].splitlines()[0]
        self.staff.refresh_from_db()
        self.assertTrue(self.staff.check_password(password))
        self.assertFalse(self.staff.check_password(self.temp_password))
        self.assertTrue(self.staff.must_change_password)
        self.assertEqual(response.data['temp_password'], password)
        self.assertEqual(response['Cache-Control'], 'no-store')

    def test_client_account_can_receive_new_password(self):
        client = Client.objects.create(firm=self.firm, user=self.staff, full_name='Demo Client')
        response = self.send(client_id=str(client.pk))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIn(self.staff.email, mail.outbox[-1].to)

    def test_rejects_clients_without_accounts_and_other_firms(self):
        client = Client.objects.create(firm=self.firm, full_name='Assisted Client')
        self.assertEqual(self.send(client_id=str(client.pk)).status_code, 400)
        other_firm = LawFirm.objects.create(name='Other firm', registration_number='OTHER-RESET', owner=self.staff)
        client.user = self.staff
        client.firm = other_firm
        client.save()
        self.assertEqual(self.send(client_id=str(client.pk)).status_code, 400)
        self.assertEqual(self.send(client_id='00000000-0000-0000-0000-000000000000').status_code, 400)
        self.assertEqual(self.send(email='outside@example.test').status_code, 400)

    def test_non_admin_cannot_reset_password(self):
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.send(email=self.staff.email).status_code, 403)

    def test_email_failure_still_returns_a_working_password(self):
        with patch('apps.staff.views.admin.temporary_password_view.send_mail', side_effect=OSError('offline')):
            response = self.send(email=self.staff.email)
        self.assertEqual(response.status_code, 200)
        self.staff.refresh_from_db()
        self.assertFalse(response.data['email_sent'])
        self.assertTrue(self.staff.check_password(response.data['temp_password']))
        self.assertTrue(self.staff.must_change_password)
