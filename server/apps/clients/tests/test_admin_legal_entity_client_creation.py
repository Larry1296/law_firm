from datetime import date
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.clients.models import (
    Client,
    ClientAddress,
    ClientRepresentative,
    CooperativeClient,
    EstateClient,
    EstatePersonalRepresentative,
    InternationalOrganizationClient,
    LimitedLiabilityPartnershipClient,
    LLPPartner,
    NonProfitOrganizationClient,
    PartnershipClient,
    PartnershipPartner,
    PublicEntityClient,
    SocietyAssociationClient,
    SoleProprietorshipClient,
    TrustClient,
    TrustTrustee,
)
from apps.common.choices import UserRole
from apps.firm.models import LawFirm
from apps.staff.models import Secretary, SecretaryPermission, SecretaryPermissionGrant
from apps.users.models import User


class AdminLegalEntityClientCreationTests(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        self.admin = User.objects.create_user(
            email="legal-entity-admin@example.com",
            password="strong-pass123",
            first_name="Legal",
            last_name="Admin",
            phone_number="+254700910001",
            national_id_number="ADM-LE-001",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(
            name="Canonical Client Test Firm",
            registration_number="FIRM-CANONICAL-001",
            owner=self.admin,
        )
        self.api_client.force_authenticate(user=self.admin)
        self.url = reverse("admin-legal-entity-client-create")

    def base_payload(self, client_type, **overrides):
        type_slug = client_type.lower()
        data = {
            "client_type": client_type,
            "access_type": Client.AccessType.ASSISTED,
            "legal_name": f"Canonical {client_type.replace('_', ' ').title()}",
            "registration_number": f"REG-{type_slug}-001",
            "kra_pin": f"P{abs(hash(client_type)) % 1000000000:09d}A",
            "phone_number": "+254700910002",
            "country": "Kenya",
            "county": "Nairobi",
            "city": "Nairobi",
            "street": "Milimani",
            "full_address": "Milimani, Nairobi",
            "contact_full_name": "Mercy Wanjiku Njeri",
            "contact_role_or_designation": "Authorized Officer",
            "contact_email": f"contact-{type_slug}@example.test",
            "contact_phone_number": "+254700910003",
            "representatives": [
                {
                    "full_legal_name": "Mercy Wanjiku Njeri",
                    "representative_category": "AUTHORIZED_AGENT",
                    "role_title": "Authorized Officer",
                    "email": f"rep-{type_slug}@example.test",
                    "telephone": "+254700910004",
                    "authority_type": "Board resolution",
                    "authority_document_reference": f"AUTH-{type_slug}-001",
                    "is_primary": True,
                    "is_portal_contact": False,
                    "is_litigation_representative": True,
                }
            ],
        }
        data.update(overrides)
        return data

    def payload_for(self, client_type, **overrides):
        data = self.base_payload(client_type, **overrides)
        if client_type == Client.ClientType.SOLE_PROPRIETORSHIP:
            data.update(
                {
                    "registered_business_name": "Wanjiku Hardware Stores",
                    "business_registration_number": "BN-2026-001",
                    "proprietor_name": "Mercy Wanjiku Njeri",
                    "proprietor_identifier": "24567891",
                    "trading_name": "Wanjiku Hardware",
                }
            )
        elif client_type == Client.ClientType.PARTNERSHIP:
            data.update(
                {
                    "partnership_name": "Nairobi Works Partnership",
                    "subtype": PartnershipClient.PartnershipSubtype.GENERAL_PARTNERSHIP,
                    "partners": [
                        {
                            "legal_name": "Peter Ben",
                            "identifier": "PARTNER-ID-001",
                            "partner_designation": "GENERAL_PARTNER",
                        },
                        {
                            "legal_name": "Mercy Wanjiku",
                            "identifier": "PARTNER-ID-002",
                            "partner_designation": "GENERAL_PARTNER",
                        },
                    ],
                }
            )
        elif client_type == Client.ClientType.LIMITED_LIABILITY_PARTNERSHIP:
            data.update(
                {
                    "registered_name": "Nairobi Works LLP",
                    "llp_registration_number": "LLP-2026-001",
                    "partners": [
                        {
                            "legal_name": "Peter Ben",
                            "identifier": "LLP-PARTNER-ID-001",
                            "is_designated_partner": True,
                            "partner_type": "INDIVIDUAL",
                        },
                        {
                            "legal_name": "Mercy Wanjiku",
                            "identifier": "LLP-PARTNER-ID-002",
                            "is_designated_partner": False,
                            "partner_type": "INDIVIDUAL",
                        },
                    ],
                }
            )
        elif client_type in {
            Client.ClientType.COOPERATIVE,
            Client.ClientType.SACCO,
        }:
            data.update(
                {
                    "registered_name": "Nairobi SACCO Society",
                    "cooperative_subtype": (
                        CooperativeClient.CooperativeSubtype.SACCO
                        if client_type == Client.ClientType.SACCO
                        else CooperativeClient.CooperativeSubtype.PRIMARY_COOPERATIVE
                    ),
                    "area_of_operation": "Nairobi County",
                }
            )
            data["representatives"][0].update(
                {
                    "representative_category": "COOPERATIVE_OFFICER",
                    "role_title": (
                        "SACCO Officer"
                        if client_type == Client.ClientType.SACCO
                        else "Cooperative Officer"
                    ),
                    "national_id_or_passport": "COOPERATIVE-OFFICER-ID-001",
                }
            )
        elif client_type == Client.ClientType.SOCIETY_OR_ASSOCIATION:
            data.update(
                {
                    "legal_name": "Milimani Residents Association",
                    "registration_status": "REGISTERED",
                    "constitution_reference": "CONST-2026-001",
                }
            )
        elif client_type in {
            Client.ClientType.NON_PROFIT_ORGANIZATION,
            Client.ClientType.NGO,
        }:
            data.update(
                {
                    "registered_name": "Nairobi Public Benefit Initiative",
                    "nonprofit_form": (
                        NonProfitOrganizationClient.NonProfitForm.LEGACY_NGO_OR_TRANSITIONAL
                        if client_type == Client.ClientType.NGO
                        else NonProfitOrganizationClient.NonProfitForm.PUBLIC_BENEFIT_ORGANIZATION
                    ),
                    "objectives": "Public-interest community legal awareness.",
                }
            )
            if client_type == Client.ClientType.NGO:
                data["representatives"][0].update(
                    {
                        "representative_category": "PBO_OFFICIAL",
                        "role_title": "NGO Official",
                        "national_id_or_passport": "NGO-OFFICIAL-ID-001",
                    }
                )
        elif client_type == Client.ClientType.TRUST:
            data.update(
                {
                    "trust_name": "Wanjiku Family Trust",
                    "trust_type": TrustClient.TrustSubtype.PRIVATE_TRUST,
                    "trust_deed_reference": "TRUST-DEED-001",
                    "trustees": [
                        {
                            "legal_name": "Mercy Wanjiku",
                            "identifier": "TRUSTEE-ID-001",
                            "is_primary_contact": True,
                            "authority_to_instruct": True,
                        }
                    ],
                }
            )
        elif client_type == Client.ClientType.ESTATE:
            data.update(
                {
                    "estate_name": "Estate of John Kamau",
                    "deceased_full_name": "John Kamau",
                    "date_of_death": "2025-02-10",
                    "grant_status": "ISSUED",
                    "personal_representatives": [
                        {
                            "legal_name": "Mary Wanjiku Kamau",
                            "identifier": "ESTATE-REP-ID-001",
                            "representative_type": "ADMINISTRATOR",
                            "is_primary": True,
                        }
                    ],
                }
            )
        elif client_type == Client.ClientType.PUBLIC_ENTITY:
            data.update(
                {
                    "official_name": "County Roads Authority",
                    "public_entity_subtype": PublicEntityClient.PublicEntitySubtype.COUNTY_ENTITY,
                    "enabling_instrument": "County enabling statute",
                    "jurisdiction_level": "COUNTY",
                }
            )
        elif client_type == Client.ClientType.INTERNATIONAL_ORGANIZATION:
            data.update(
                {
                    "official_name": "Regional Development Organization",
                    "organization_type": InternationalOrganizationClient.OrganizationType.INTERGOVERNMENTAL,
                    "founding_instrument": "Founding treaty",
                    "headquarters_country": "Kenya",
                }
            )
        return data

    def test_all_canonical_legal_entity_types_can_be_created_as_assisted_clients(self):
        profile_checks = {
            Client.ClientType.SOLE_PROPRIETORSHIP: SoleProprietorshipClient,
            Client.ClientType.PARTNERSHIP: PartnershipClient,
            Client.ClientType.LIMITED_LIABILITY_PARTNERSHIP: LimitedLiabilityPartnershipClient,
            Client.ClientType.COOPERATIVE: CooperativeClient,
            Client.ClientType.SACCO: CooperativeClient,
            Client.ClientType.SOCIETY_OR_ASSOCIATION: SocietyAssociationClient,
            Client.ClientType.NON_PROFIT_ORGANIZATION: NonProfitOrganizationClient,
            Client.ClientType.NGO: NonProfitOrganizationClient,
            Client.ClientType.TRUST: TrustClient,
            Client.ClientType.ESTATE: EstateClient,
            Client.ClientType.PUBLIC_ENTITY: PublicEntityClient,
            Client.ClientType.INTERNATIONAL_ORGANIZATION: InternationalOrganizationClient,
        }

        for client_type, profile_model in profile_checks.items():
            with self.subTest(client_type=client_type):
                response = self.api_client.post(
                    self.url,
                    self.payload_for(client_type),
                    format="json",
                )

                self.assertEqual(response.status_code, 201, response.data)
                client = Client.objects.get(id=response.data["client"]["id"])
                self.assertEqual(client.client_type, client_type)
                self.assertEqual(client.access_type, Client.AccessType.ASSISTED)
                self.assertIsNone(client.user_id)
                self.assertIsNone(response.data["portal_user"])
                self.assertIsNone(response.data["temp_password"])
                self.assertTrue(profile_model.objects.filter(client=client).exists())
                self.assertTrue(ClientAddress.objects.filter(client=client).exists())
                self.assertTrue(ClientRepresentative.objects.filter(client=client).exists())

    def test_normalized_child_records_are_created_for_capacity_sensitive_types(self):
        self.api_client.post(
            self.url,
            self.payload_for(Client.ClientType.PARTNERSHIP),
            format="json",
        )
        self.api_client.post(
            self.url,
            self.payload_for(Client.ClientType.LIMITED_LIABILITY_PARTNERSHIP),
            format="json",
        )
        self.api_client.post(
            self.url,
            self.payload_for(Client.ClientType.TRUST),
            format="json",
        )
        self.api_client.post(
            self.url,
            self.payload_for(Client.ClientType.ESTATE),
            format="json",
        )

        self.assertEqual(PartnershipPartner.objects.count(), 2)
        self.assertEqual(LLPPartner.objects.count(), 2)
        self.assertEqual(TrustTrustee.objects.count(), 1)
        self.assertEqual(EstatePersonalRepresentative.objects.count(), 1)

    def test_partnership_requires_two_active_partners(self):
        payload = self.payload_for(Client.ClientType.PARTNERSHIP)
        payload["partners"] = [{"legal_name": "Single Partner"}]

        response = self.api_client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("partners", response.data["errors"])

    def test_partnership_requires_identification_for_each_individual_partner(self):
        payload = self.payload_for(Client.ClientType.PARTNERSHIP)
        payload["partners"][1]["identifier"] = ""

        response = self.api_client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("partners", response.data["errors"])

    def test_portal_partnership_creates_login_for_primary_partner(self):
        payload = self.payload_for(
            Client.ClientType.PARTNERSHIP,
            access_type=Client.AccessType.PORTAL_ENABLED,
            email="portal-partnership@example.test",
            phone_number="+254700910040",
            contact_full_name="Peter Ben",
            contact_national_id_number="PARTNER-ID-001",
        )
        payload["representatives"][0].update(
            {
                "full_legal_name": "Peter Ben",
                "representative_category": "PARTNER",
                "national_id_or_passport": "PARTNER-ID-001",
                "email": payload["email"],
                "telephone": payload["phone_number"],
                "is_portal_contact": True,
            }
        )

        response = self.api_client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, 201, response.data)
        client = Client.objects.select_related("user").get(
            id=response.data["client"]["id"]
        )
        self.assertEqual(client.full_name, "Nairobi Works Partnership")
        self.assertEqual(client.access_type, Client.AccessType.PORTAL_ENABLED)
        self.assertEqual(client.lifecycle_status, Client.LifecycleStatus.PROSPECTIVE)
        self.assertEqual(client.phone_number, "+254700910040")
        self.assertEqual(client.user.email, "portal-partnership@example.test")
        self.assertEqual(client.user.first_name, "Peter")
        self.assertEqual(
            response.data["representatives"][0]["representative_category"],
            "PARTNER",
        )
        self.assertTrue(response.data["temp_password"])

    def test_portal_llp_creates_login_for_designated_partner(self):
        payload = self.payload_for(
            Client.ClientType.LIMITED_LIABILITY_PARTNERSHIP,
            access_type=Client.AccessType.PORTAL_ENABLED,
            email="portal-llp@example.test",
            phone_number="+254700910041",
            contact_full_name="Peter Ben",
            contact_national_id_number="LLP-PARTNER-ID-001",
        )
        payload["representatives"][0].update(
            {
                "full_legal_name": "Peter Ben",
                "representative_category": "DESIGNATED_PARTNER",
                "national_id_or_passport": "LLP-PARTNER-ID-001",
                "email": payload["email"],
                "telephone": payload["phone_number"],
                "is_portal_contact": True,
            }
        )

        response = self.api_client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, 201, response.data)
        client = Client.objects.select_related("user").get(
            id=response.data["client"]["id"]
        )
        self.assertEqual(client.full_name, "Nairobi Works LLP")
        self.assertEqual(client.access_type, Client.AccessType.PORTAL_ENABLED)
        self.assertEqual(client.lifecycle_status, Client.LifecycleStatus.PROSPECTIVE)
        self.assertEqual(client.phone_number, "+254700910041")
        self.assertEqual(client.user.email, "portal-llp@example.test")
        self.assertEqual(client.user.first_name, "Peter")
        self.assertEqual(client.llp_profile.partners.count(), 2)
        self.assertEqual(
            response.data["representatives"][0]["representative_category"],
            "DESIGNATED_PARTNER",
        )
        self.assertTrue(response.data["temp_password"])

    def test_llp_requires_two_identified_active_partners(self):
        payload = self.payload_for(
            Client.ClientType.LIMITED_LIABILITY_PARTNERSHIP,
        )
        payload["partners"] = payload["partners"][:1]

        response = self.api_client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("partners", response.data["errors"])

    def test_portal_trust_creates_login_for_primary_trustee(self):
        payload = self.payload_for(
            Client.ClientType.TRUST,
            access_type=Client.AccessType.PORTAL_ENABLED,
            email="portal-trustee@example.test",
            phone_number="+254700910042",
            contact_full_name="Mercy Wanjiku",
            contact_national_id_number="TRUSTEE-ID-001",
        )
        payload["representatives"][0].update(
            {
                "full_legal_name": "Mercy Wanjiku",
                "representative_category": "TRUSTEE",
                "role_title": "Trustee",
                "national_id_or_passport": "TRUSTEE-ID-001",
                "email": payload["email"],
                "telephone": payload["phone_number"],
                "is_portal_contact": True,
            }
        )

        response = self.api_client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, 201, response.data)
        client = Client.objects.select_related("user").get(
            id=response.data["client"]["id"]
        )
        self.assertEqual(client.full_name, "Wanjiku Family Trust")
        self.assertEqual(client.access_type, Client.AccessType.PORTAL_ENABLED)
        self.assertEqual(client.lifecycle_status, Client.LifecycleStatus.PROSPECTIVE)
        self.assertEqual(client.phone_number, "+254700910042")
        self.assertEqual(client.user.email, "portal-trustee@example.test")
        self.assertEqual(client.user.first_name, "Mercy")
        self.assertEqual(TrustTrustee.objects.filter(trust=client.trust_profile).count(), 1)
        self.assertEqual(
            response.data["representatives"][0]["representative_category"],
            "TRUSTEE",
        )
        self.assertTrue(response.data["temp_password"])

    def test_trust_requires_identified_individual_trustee(self):
        payload = self.payload_for(Client.ClientType.TRUST)
        payload["trustees"][0]["identifier"] = ""

        response = self.api_client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("trustees", response.data["errors"])

    def test_portal_estate_creates_login_for_personal_representative(self):
        payload = self.payload_for(
            Client.ClientType.ESTATE,
            access_type=Client.AccessType.PORTAL_ENABLED,
            email="portal-administrator@example.test",
            phone_number="+254700910043",
            contact_full_name="Mary Wanjiku Kamau",
            contact_national_id_number="ESTATE-REP-ID-001",
        )
        payload["representatives"][0].update(
            {
                "full_legal_name": "Mary Wanjiku Kamau",
                "representative_category": "ADMINISTRATOR",
                "role_title": "Administrator",
                "national_id_or_passport": "ESTATE-REP-ID-001",
                "email": payload["email"],
                "telephone": payload["phone_number"],
                "is_portal_contact": True,
            }
        )

        response = self.api_client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, 201, response.data)
        client = Client.objects.select_related("user").get(
            id=response.data["client"]["id"]
        )
        self.assertEqual(client.full_name, "Estate of John Kamau")
        self.assertEqual(client.access_type, Client.AccessType.PORTAL_ENABLED)
        self.assertEqual(client.lifecycle_status, Client.LifecycleStatus.PROSPECTIVE)
        self.assertEqual(client.phone_number, "+254700910043")
        self.assertEqual(client.user.email, "portal-administrator@example.test")
        self.assertEqual(client.user.first_name, "Mary")
        self.assertEqual(client.estate_profile.personal_representatives.count(), 1)
        self.assertEqual(
            response.data["representatives"][0]["representative_category"],
            "ADMINISTRATOR",
        )
        self.assertTrue(response.data["temp_password"])

    def test_estate_requires_identified_personal_representative(self):
        payload = self.payload_for(Client.ClientType.ESTATE)
        payload["personal_representatives"][0]["identifier"] = ""

        response = self.api_client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("personal_representatives", response.data["errors"])

    def test_portal_sacco_preserves_sacco_category_and_creates_officer_login(self):
        payload = self.payload_for(
            Client.ClientType.SACCO,
            access_type=Client.AccessType.PORTAL_ENABLED,
            email="portal-sacco@example.test",
            phone_number="+254700910044",
            contact_full_name="Mercy Wanjiku Njeri",
            contact_national_id_number="SACCO-OFFICER-ID-001",
        )
        payload["representatives"][0].update(
            {
                "email": payload["email"],
                "telephone": payload["phone_number"],
                "is_portal_contact": True,
            }
        )

        response = self.api_client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, 201, response.data)
        client = Client.objects.select_related("user").get(
            id=response.data["client"]["id"]
        )
        self.assertEqual(client.client_type, Client.ClientType.SACCO)
        self.assertEqual(client.cooperative_profile.subtype, "SACCO")
        self.assertEqual(client.access_type, Client.AccessType.PORTAL_ENABLED)
        self.assertEqual(client.lifecycle_status, Client.LifecycleStatus.PROSPECTIVE)
        self.assertEqual(client.phone_number, "+254700910044")
        self.assertEqual(client.user.email, "portal-sacco@example.test")
        self.assertEqual(client.user.first_name, "Mercy")
        self.assertEqual(
            response.data["representatives"][0]["representative_category"],
            "COOPERATIVE_OFFICER",
        )
        self.assertTrue(response.data["temp_password"])

    def test_sacco_requires_identified_authorized_officer(self):
        payload = self.payload_for(Client.ClientType.SACCO)
        payload["representatives"][0]["national_id_or_passport"] = ""

        response = self.api_client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("representatives", response.data["errors"])

    def test_portal_ngo_preserves_ngo_category_and_creates_official_login(self):
        payload = self.payload_for(
            Client.ClientType.NGO,
            access_type=Client.AccessType.PORTAL_ENABLED,
            email="portal-ngo@example.test",
            phone_number="+254700910045",
            contact_full_name="Mercy Wanjiku Njeri",
            contact_national_id_number="NGO-OFFICIAL-ID-001",
        )
        payload["representatives"][0].update(
            {
                "email": payload["email"],
                "telephone": payload["phone_number"],
                "is_portal_contact": True,
            }
        )

        response = self.api_client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, 201, response.data)
        client = Client.objects.select_related("user").get(
            id=response.data["client"]["id"]
        )
        self.assertEqual(client.client_type, Client.ClientType.NGO)
        self.assertEqual(
            client.nonprofit_profile.nonprofit_form,
            NonProfitOrganizationClient.NonProfitForm.LEGACY_NGO_OR_TRANSITIONAL,
        )
        self.assertEqual(client.access_type, Client.AccessType.PORTAL_ENABLED)
        self.assertEqual(client.lifecycle_status, Client.LifecycleStatus.PROSPECTIVE)
        self.assertEqual(client.phone_number, "+254700910045")
        self.assertEqual(client.user.email, "portal-ngo@example.test")
        self.assertEqual(client.user.first_name, "Mercy")
        self.assertEqual(
            response.data["representatives"][0]["representative_category"],
            "PBO_OFFICIAL",
        )
        self.assertTrue(response.data["temp_password"])

    def test_ngo_requires_identified_authorized_official(self):
        payload = self.payload_for(Client.ClientType.NGO)
        payload["representatives"][0]["national_id_or_passport"] = ""

        response = self.api_client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("representatives", response.data["errors"])

    def test_portal_cooperative_creates_login_for_authorized_officer(self):
        payload = self.payload_for(
            Client.ClientType.COOPERATIVE,
            access_type=Client.AccessType.PORTAL_ENABLED,
            email="portal-cooperative-officer@example.test",
            phone_number="+254700910046",
            contact_full_name="Mercy Wanjiku Njeri",
            contact_national_id_number="COOPERATIVE-OFFICER-ID-001",
        )
        payload["representatives"][0].update(
            {
                "email": payload["email"],
                "telephone": payload["phone_number"],
                "is_portal_contact": True,
            }
        )

        response = self.api_client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, 201, response.data)
        client = Client.objects.select_related("user").get(
            id=response.data["client"]["id"]
        )
        self.assertEqual(client.client_type, Client.ClientType.COOPERATIVE)
        self.assertEqual(
            client.cooperative_profile.subtype,
            CooperativeClient.CooperativeSubtype.PRIMARY_COOPERATIVE,
        )
        self.assertEqual(client.access_type, Client.AccessType.PORTAL_ENABLED)
        self.assertEqual(client.lifecycle_status, Client.LifecycleStatus.PROSPECTIVE)
        self.assertEqual(client.phone_number, "+254700910046")
        self.assertEqual(
            client.user.email,
            "portal-cooperative-officer@example.test",
        )
        self.assertEqual(
            response.data["representatives"][0]["representative_category"],
            "COOPERATIVE_OFFICER",
        )
        self.assertTrue(response.data["temp_password"])

    def test_cooperative_requires_identified_authorized_officer(self):
        payload = self.payload_for(Client.ClientType.COOPERATIVE)
        payload["representatives"][0]["national_id_or_passport"] = ""

        response = self.api_client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("representatives", response.data["errors"])

    def test_portal_legal_entity_returns_stable_credentials_shape(self):
        response = self.api_client.post(
            self.url,
            self.payload_for(
                Client.ClientType.COOPERATIVE,
                access_type=Client.AccessType.PORTAL_ENABLED,
                email="portal-cooperative@example.test",
                phone_number="+254700910010",
            ),
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        client = Client.objects.select_related("user").get(
            email="portal-cooperative@example.test"
        )
        self.assertIsNotNone(client.user_id)
        self.assertEqual(response.data["portal_user"]["email"], client.user.email)
        self.assertTrue(response.data["temp_password"])

    def test_assisted_sole_proprietorship_uses_proprietor_contact_without_login(self):
        payload = self.payload_for(
            Client.ClientType.SOLE_PROPRIETORSHIP,
            email="",
            phone_number="",
            contact_phone_number="+254700910031",
            access_type=Client.AccessType.ASSISTED,
        )

        response = self.api_client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, 201, response.data)
        client = Client.objects.get(id=response.data["client"]["id"])
        self.assertEqual(client.access_type, Client.AccessType.ASSISTED)
        self.assertEqual(client.lifecycle_status, Client.LifecycleStatus.PROSPECTIVE)
        self.assertEqual(client.full_name, "Wanjiku Hardware Stores")
        self.assertEqual(client.phone_number, "+254700910031")
        self.assertIsNone(client.user_id)
        self.assertIsNone(response.data["portal_user"])
        self.assertIsNone(response.data["temp_password"])

    def test_portal_sole_proprietorship_creates_login_for_proprietor(self):
        payload = self.payload_for(
            Client.ClientType.SOLE_PROPRIETORSHIP,
            access_type=Client.AccessType.PORTAL_ENABLED,
            email="wanjiku-hardware@example.test",
            phone_number="+254700910032",
        )
        payload["contact_full_name"] = payload["proprietor_name"]
        payload["contact_national_id_number"] = payload["proprietor_identifier"]
        payload["representatives"][0].update(
            {
                "full_legal_name": payload["proprietor_name"],
                "representative_category": "PROPRIETOR",
                "national_id_or_passport": payload["proprietor_identifier"],
                "email": payload["email"],
                "telephone": payload["phone_number"],
                "is_portal_contact": True,
            }
        )

        response = self.api_client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, 201, response.data)
        client = Client.objects.select_related("user").get(
            id=response.data["client"]["id"]
        )
        self.assertEqual(client.access_type, Client.AccessType.PORTAL_ENABLED)
        self.assertEqual(client.lifecycle_status, Client.LifecycleStatus.PROSPECTIVE)
        self.assertEqual(client.phone_number, "+254700910032")
        self.assertIsNotNone(client.user_id)
        self.assertEqual(client.user.email, "wanjiku-hardware@example.test")
        self.assertEqual(client.user.first_name, "Mercy")
        self.assertEqual(
            response.data["representatives"][0]["representative_category"],
            "PROPRIETOR",
        )
        self.assertTrue(response.data["temp_password"])

    def test_sole_proprietorship_requires_proprietor_identification(self):
        payload = self.payload_for(Client.ClientType.SOLE_PROPRIETORSHIP)
        payload["proprietor_identifier"] = ""
        response = self.api_client.post(
            self.url,
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("proprietor_identifier", response.data["errors"])

    def test_detail_endpoint_exposes_profile_and_representatives(self):
        create_response = self.api_client.post(
            self.url,
            self.payload_for(Client.ClientType.PUBLIC_ENTITY),
            format="json",
        )

        detail_response = self.api_client.get(
            reverse(
                "admin-client-detail",
                kwargs={"client_id": create_response.data["client"]["id"]},
            )
        )

        self.assertEqual(detail_response.status_code, 200, detail_response.data)
        detail = detail_response.data["client"]["detail"]
        self.assertEqual(detail["client_type"], Client.ClientType.PUBLIC_ENTITY)
        self.assertEqual(detail["type_profile"]["official_name"], "County Roads Authority")
        self.assertEqual(
            detail["representatives"][0]["full_legal_name"],
            "Mercy Wanjiku Njeri",
        )

    def test_secretary_portal_sole_proprietorship_matches_admin_client_data(self):
        secretary_user = User.objects.create_user(
            email="canonical-secretary@example.com",
            password="strong-pass123",
            first_name="Canonical",
            last_name="Secretary",
            phone_number="+254700910020",
            national_id_number="SEC-CAN-001",
            role=UserRole.STAFF,
        )
        secretary = Secretary.objects.create(
            user=secretary_user,
            law_firm=self.firm,
            staff_number="SEC-CANONICAL-001",
            date_hired=date(2026, 7, 7),
        )
        SecretaryPermissionGrant.objects.create(
            secretary=secretary,
            code=SecretaryPermission.MANAGE_CLIENTS,
            granted_by=self.admin,
        )

        self.api_client.force_authenticate(user=secretary_user)
        payload = self.payload_for(
            Client.ClientType.SOLE_PROPRIETORSHIP,
            access_type=Client.AccessType.PORTAL_ENABLED,
            email="secretary-sole-portal@example.test",
            phone_number="+254700910021",
        )
        payload["contact_full_name"] = payload["proprietor_name"]
        payload["contact_national_id_number"] = payload["proprietor_identifier"]
        payload["representatives"][0].update(
            {
                "full_legal_name": payload["proprietor_name"],
                "representative_category": "PROPRIETOR",
                "national_id_or_passport": payload["proprietor_identifier"],
                "email": payload["email"],
                "telephone": payload["phone_number"],
                "is_portal_contact": True,
            }
        )
        response = self.api_client.post(
            reverse("secretary-client-create", kwargs={"client_type": "legal-entities"}),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(
            set(response.data.keys()),
            {
                "client",
                "profile",
                "representatives",
                "registered_address",
                "primary_contact",
                "portal_user",
                "temp_password",
            },
        )
        listed_response = self.api_client.get(reverse("secretary-clients"))
        self.assertEqual(listed_response.status_code, 200, listed_response.data)
        listed_client = next(
            item
            for item in listed_response.data["clients"]
            if item["id"] == response.data["client"]["id"]
        )
        self.assertEqual(
            listed_client["access_type"],
            Client.AccessType.PORTAL_ENABLED,
        )
        self.assertEqual(
            listed_client["lifecycle_status"],
            Client.LifecycleStatus.PROSPECTIVE,
        )
        self.assertEqual(listed_client["phone_number"], "+254700910021")
        self.assertTrue(listed_client["portal_access_exists"])
        self.assertEqual(
            listed_client["portal_login_email"],
            "secretary-sole-portal@example.test",
        )
        self.assertTrue(listed_client["is_active"])

    def test_creation_rolls_back_when_profile_creation_fails(self):
        with patch(
            "apps.clients.services.admin.client_admin_create_service."
            "PublicEntityClient.objects.create",
            side_effect=RuntimeError("profile failed"),
        ):
            response = self.api_client.post(
                self.url,
                self.payload_for(Client.ClientType.PUBLIC_ENTITY),
                format="json",
            )

        self.assertGreaterEqual(response.status_code, 400)
        self.assertFalse(Client.objects.filter(full_name="County Roads Authority").exists())
