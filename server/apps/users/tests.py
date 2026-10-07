from io import StringIO

from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.users.models import User

PASSWORD = "Platform-Owner-2026!"


class CreateSuperuserTests(TestCase):
    def create(self):
        call_command(
            "createsuperuser", interactive=False, stdout=StringIO(), email="owner@sheria.test",
            first_name="Larry", last_name="Musau", phone_number="+254700000111", national_id_number="11111111",
        )
        user = User.objects.get(email="owner@sheria.test")
        user.set_password(PASSWORD)
        user.save()
        return user

    def test_createsuperuser_makes_the_platform_administrator(self):
        user = self.create()
        self.assertEqual(user.role, UserRole.PLATFORM_ADMIN)
        self.assertTrue(user.is_superuser)

    def test_the_platform_administrator_gets_no_firm_even_after_migrate(self):
        user = self.create()
        call_command("migrate", verbosity=0)
        self.assertFalse(LawFirm.objects.filter(owner=user).exists())

    def test_the_platform_administrator_signs_in_to_the_console(self):
        self.create()
        response = APIClient().post("/api/auth/login/", {"email": "owner@sheria.test", "password": PASSWORD}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data["user"]["is_platform_admin"])
