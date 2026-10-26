from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from rest_framework.test import APIClient

from apps.cases.models import Case
from apps.clients.models import Client
from apps.firm.management.commands.seed_practice_firm import Command, PASSWORD, STAFF
from apps.staff.models import Accountant, AccountantPermission, Lawyer


class PracticeSeedTests(TestCase):
    def test_seed_creates_sign_in_ready_staff_and_empty_client_register(self):
        Command().seed()
        self.assertEqual(Client.objects.count(), 0)
        self.assertEqual(Case.objects.count(), 0)
        self.assertTrue(Lawyer.objects.get(user__email=STAFF['advocate'][0]).office_location)
        accountant = Accountant.objects.get(user__email=STAFF['accountant'][0])
        self.assertTrue(accountant.has_permission(AccountantPermission.RECONCILE_ACCOUNTS))
        for key, (email, *_rest) in STAFF.items():
            response = APIClient().post('/api/auth/login/', {'email': email, 'password': PASSWORD}, format='json')
            self.assertEqual(response.status_code, 200, (key, response.data))

    def test_command_refuses_non_practice_database(self):
        with self.assertRaises(CommandError):
            call_command('seed_practice_firm', stdout=StringIO())
