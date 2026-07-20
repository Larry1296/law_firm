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
            "access_type": Client.AccessType.ASSISTED_CLIENT,
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
                        {"legal_name": "Peter Ben", "partner_designation": "GENERAL_PARTNER"},
                        {"legal_name": "Mercy Wanjiku", "partner_designation": "GENERAL_PARTNER"},
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
                            "is_designated_partner": True,
                            "partner_type": "INDIVIDUAL",
                        }
                    ],
                }
            )
        elif client_type == Client.ClientType.COOPERATIVE:
            data.update(
                {
                    "registered_name": "Nairobi SACCO Society",
                    "cooperative_subtype": CooperativeClient.CooperativeSubtype.SACCO,
                    "area_of_operation": "Nairobi County",
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
        elif client_type == Client.ClientType.NON_PROFIT_ORGANIZATION:
            data.update(
                {
                    "registered_name": "Nairobi Public Benefit Initiative",
                    "nonprofit_form": NonProfitOrganizationClient.NonProfitForm.PUBLIC_BENEFIT_ORGANIZATION,
                    "objectives": "Public-interest community legal awareness.",
                }
            )
        elif client_type == Client.ClientType.TRUST:
            data.update(
                {
                    "trust_name": "Wanjiku Family Trust",
                    "trust_type": TrustClient.TrustSubtype.PRIVATE_TRUST,
                    "trust_deed_reference": "TRUST-DEED-001",
                    "trustees": [{"legal_name": "Mercy Wanjiku", "is_primary": True}],
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
            Client.ClientType.SOCIETY_OR_ASSOCIATION: SocietyAssociationClient,
            Client.ClientType.NON_PROFIT_ORGANIZATION: NonProfitOrganizationClient,
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
                self.assertEqual(client.access_type, Client.AccessType.ASSISTED_CLIENT)
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
        self.assertEqual(LLPPartner.objects.count(), 1)
        self.assertEqual(TrustTrustee.objects.count(), 1)
        self.assertEqual(EstatePersonalRepresentative.objects.count(), 1)

    def test_partnership_requires_two_active_partners(self):
        payload = self.payload_for(Client.ClientType.PARTNERSHIP)
        payload["partners"] = [{"legal_name": "Single Partner"}]

        response = self.api_client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn("partners", response.data["errors"])

    def test_portal_legal_entity_returns_stable_credentials_shape(self):
        response = self.api_client.post(
            self.url,
            self.payload_for(
                Client.ClientType.COOPERATIVE,
                access_type=Client.AccessType.PROSPECT,
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

    def test_secretary_legal_entity_creation_uses_same_response_contract(self):
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
        response = self.api_client.post(
            reverse("secretary-client-create", kwargs={"client_type": "legal-entities"}),
            self.payload_for(Client.ClientType.SOCIETY_OR_ASSOCIATION),
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
