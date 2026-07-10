from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.users.models import User


class LawyerProfileEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="lawyer-profile@example.com",
            password="strong-pass123",
            first_name="John",
            last_name="Doe",
            phone_number="+254700000001",
        )

    def test_lawyer_profile_endpoint_requires_lawyer_profile(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(reverse("lawyer-profile"))

        self.assertEqual(response.status_code, 403)
