from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.clients.models import Client, EducationInstitutionProfile
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.users.models import User


class ClientOnboardingApiTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="onboarding-admin@example.test", password="strong-pass123", first_name="Onboarding",
            last_name="Admin", phone_number="+254700101001", national_id_number="ONBOARD-ADMIN-1", role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(name="Onboarding Test Advocates", registration_number="FIRM-ONBOARD-1", owner=self.admin)
        self.api = APIClient()
        self.api.force_authenticate(self.admin)

    def test_company_owned_private_school_round_trips_without_education_legal_type(self):
        response = self.api.post(reverse("client-onboarding-create"), {
            "client": {"client_type": "COMPANY", "full_name": "Greenfields Education Limited", "access_type": "ASSISTED", "sectors": ["EDUCATION"]},
            "legal_profile": {"company_name": "Greenfields Education Limited", "registration_number": "PVT-EDU-2026-1", "company_type": "PRIVATE_LIMITED_COMPANY", "country_of_incorporation": "Kenya"},
            "representatives": [{"full_legal_name": "Jane Wanjiku", "representative_category": "DIRECTOR", "role_title": "Director", "authority_type": "BOARD_RESOLUTION", "authority_document_reference": "BR-2026-1", "is_primary": True, "is_authorized_to_give_instructions": True}],
            "contacts": [{"contact_type": "PRIMARY", "full_name": "Jane Wanjiku", "email": "jane@greenfields.test", "phone_number": "+254700101002", "preferred_channel": "EMAIL", "is_primary": True}],
            "addresses": [{"address_type": "REGISTERED", "country": "Kenya", "county": "Nairobi", "city": "Nairobi", "full_address": "Nairobi, Kenya", "is_primary": True}],
            "due_diligence": {"identity_verification_status": "PENDING", "pep_status": "NOT_CHECKED", "sanctions_screening_status": "NOT_CHECKED", "risk_rating": "NOT_ASSESSED", "acting_for_self": False, "purpose_of_legal_services": "Education-sector legal advice"},
            "privacy": {"lawful_basis": "CONTRACTUAL_NECESSITY", "privacy_notice_version": "2026.1", "privacy_notice_delivered": False},
            "regulatory_profiles": {"education": {"education_regime": "BASIC_EDUCATION", "institution_official_name": "Greenfields Academy", "ownership": "PRIVATE", "operator_legal_name": "Greenfields Education Limited", "education_levels": ["PRIMARY", "JUNIOR_SCHOOL"], "curricula": [{"framework": "KENYA_CBE_CBC", "education_levels": ["PRIMARY", "JUNIOR_SCHOOL"]}]}}
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        client = Client.objects.get(id=response.data["client"]["id"])
        self.assertEqual(client.client_type, Client.ClientType.COMPANY)
        self.assertEqual(client.lifecycle_status, Client.LifecycleStatus.PROSPECTIVE)
        self.assertEqual(client.education_profile.institution_official_name, "Greenfields Academy")
        self.assertEqual(response.data["client"]["education_profile"]["education_regime_label"], "Basic Education Institution")

    def test_other_path_requires_description_and_evidence(self):
        response = self.api.post(reverse("client-onboarding-create"), {"client": {"client_type": "OTHER_REQUIRES_REVIEW", "full_name": "Unresolved Body"}}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_private_education_requires_legal_operator(self):
        response = self.api.post(reverse("client-onboarding-create"), {
            "client": {"client_type": "OTHER_REQUIRES_REVIEW", "full_name": "Unknown School", "provisional_legal_description": "Unknown proprietor", "classification_evidence_reference": "DOC-1", "sectors": ["EDUCATION"]},
            "regulatory_profiles": {"education": {"education_regime": "BASIC_EDUCATION", "institution_official_name": "Unknown School", "ownership": "PRIVATE", "education_levels": ["PRIMARY"]}}
        }, format="json")
        self.assertEqual(response.status_code, 400)
