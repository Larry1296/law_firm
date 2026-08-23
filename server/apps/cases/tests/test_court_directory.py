from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.cases.models import Court
from apps.common.choices import UserRole
from apps.users.models import User


class CourtDirectoryApiTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.user = User.objects.create_user(
            email="court-directory@example.com",
            password="test-pass-123",
            first_name="Court",
            last_name="User",
            phone_number="+254700900001",
            national_id_number="900001",
            role=UserRole.STAFF,
        )
        self.high_court = Court.objects.create(
            name="High Court of Kenya",
            court_type=Court.CourtType.HIGH_COURT,
            level=3,
            county="Nairobi",
            station="Milimani Law Courts",
            address="Ngong Road, Nairobi",
            jurisdiction="Civil, commercial and constitutional jurisdiction",
        )
        Court.objects.create(
            name="Environment and Land Court",
            court_type=Court.CourtType.ELC,
            level=3,
            county="Mombasa",
            station="Mombasa Law Courts",
            jurisdiction="Environment and land disputes",
        )

    def test_authentication_is_required(self):
        response = self.api.get(reverse("court-directory"))
        self.assertEqual(response.status_code, 401)

    def test_directory_can_be_filtered_and_searched(self):
        self.api.force_authenticate(self.user)
        response = self.api.get(
            reverse("court-directory"),
            {"county": "nairobi", "search": "constitutional"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], str(self.high_court.id))
        self.assertEqual(response.data[0]["court_type_display"], "High Court")

    def test_court_type_filter_uses_kenyan_structure(self):
        self.api.force_authenticate(self.user)
        response = self.api.get(reverse("court-directory"), {"court_type": "ELC"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["county"] for item in response.data], ["Mombasa"])
