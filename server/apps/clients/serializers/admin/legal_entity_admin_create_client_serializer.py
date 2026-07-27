from django.utils import timezone
from rest_framework import serializers

from apps.clients.models import (
    Client,
    ClientRepresentative,
    CooperativeClient,
    InternationalOrganizationClient,
    LimitedLiabilityPartnershipClient,
    NonProfitOrganizationClient,
    PublicEntityClient,
    SocietyAssociationClient,
)
from apps.clients.serializers.admin.admin_client_base_create_serializer import (
    AdminClientBaseCreateSerializer,
)
from apps.users.models import User


CANONICAL_ENTITY_TYPES = {
    Client.ClientType.SOLE_PROPRIETORSHIP,
    Client.ClientType.PARTNERSHIP,
    Client.ClientType.LIMITED_LIABILITY_PARTNERSHIP,
    Client.ClientType.COOPERATIVE,
    Client.ClientType.SACCO,
    Client.ClientType.SOCIETY_OR_ASSOCIATION,
    Client.ClientType.NON_PROFIT_ORGANIZATION,
    Client.ClientType.NGO,
    Client.ClientType.TRUST,
    Client.ClientType.ESTATE,
    Client.ClientType.PUBLIC_ENTITY,
    Client.ClientType.INTERNATIONAL_ORGANIZATION,
}


class ClientRepresentativeInputSerializer(serializers.Serializer):
    full_legal_name = serializers.CharField(max_length=255)
    representative_category = serializers.ChoiceField(
        choices=ClientRepresentative.RepresentativeCategory.choices,
        default=ClientRepresentative.RepresentativeCategory.AUTHORIZED_AGENT,
    )
    role_title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    national_id_or_passport = serializers.CharField(max_length=100, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    telephone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    postal_address = serializers.CharField(required=False, allow_blank=True)
    physical_address = serializers.CharField(required=False, allow_blank=True)
    authority_type = serializers.CharField(max_length=100, required=False, allow_blank=True)
    authority_document_reference = serializers.CharField(max_length=150, required=False, allow_blank=True)
    authority_start_date = serializers.DateField(required=False, allow_null=True)
    authority_end_date = serializers.DateField(required=False, allow_null=True)
    is_primary = serializers.BooleanField(required=False, default=False)
    is_portal_contact = serializers.BooleanField(required=False, default=False)
    is_litigation_representative = serializers.BooleanField(required=False, default=False)
    is_verified = serializers.BooleanField(required=False, default=False)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs.get("authority_end_date") and attrs.get("authority_start_date"):
            if attrs["authority_end_date"] < attrs["authority_start_date"]:
                raise serializers.ValidationError(
                    {"authority_end_date": "Authority end date cannot be before the start date."}
                )
        return attrs


class LegalEntityAdminCreateClientSerializer(AdminClientBaseCreateSerializer):
    client_type = serializers.ChoiceField(choices=Client.ClientType.choices)

    # Shared entity identifiers.
    legal_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    registration_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    country_of_registration = serializers.CharField(max_length=100, required=False, allow_blank=True, default="Kenya")
    registration_authority = serializers.CharField(max_length=255, required=False, allow_blank=True)
    registration_date = serializers.DateField(required=False, allow_null=True)
    registered_address = serializers.CharField(required=False, allow_blank=True)
    postal_address = serializers.CharField(required=False, allow_blank=True)
    operational_address = serializers.CharField(required=False, allow_blank=True)
    status = serializers.CharField(max_length=80, required=False, allow_blank=True)
    sector = serializers.CharField(max_length=150, required=False, allow_blank=True)
    website = serializers.URLField(required=False, allow_blank=True)
    compliance_notes = serializers.CharField(required=False, allow_blank=True)

    # Sole proprietorship.
    registered_business_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    business_registration_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    proprietor_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    proprietor_identifier = serializers.CharField(max_length=100, required=False, allow_blank=True)
    proprietor_kra_pin = serializers.CharField(max_length=50, required=False, allow_blank=True)
    business_kra_pin = serializers.CharField(max_length=50, required=False, allow_blank=True)
    trading_name = serializers.CharField(max_length=255, required=False, allow_blank=True)

    # Partnership / LLP.
    partnership_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    subtype = serializers.CharField(max_length=80, required=False, allow_blank=True)
    formation_date = serializers.DateField(required=False, allow_null=True)
    principal_place_of_business = serializers.CharField(required=False, allow_blank=True)
    partnership_agreement_reference = serializers.CharField(max_length=150, required=False, allow_blank=True)
    partners = serializers.ListField(child=serializers.DictField(), required=False, default=list)

    registered_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    llp_registration_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    registered_office = serializers.CharField(required=False, allow_blank=True)
    principal_business_address = serializers.CharField(required=False, allow_blank=True)

    # Cooperative.
    cooperative_subtype = serializers.ChoiceField(
        choices=CooperativeClient.CooperativeSubtype.choices,
        required=False,
        allow_blank=True,
    )
    area_of_operation = serializers.CharField(max_length=255, required=False, allow_blank=True)
    activity_sector = serializers.CharField(max_length=150, required=False, allow_blank=True)
    regulator_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    license_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    license_status = serializers.CharField(max_length=100, required=False, allow_blank=True)

    # Society / nonprofit.
    common_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    registration_status = serializers.CharField(max_length=80, required=False, allow_blank=True)
    constitution_reference = serializers.CharField(max_length=150, required=False, allow_blank=True)
    objectives = serializers.CharField(required=False, allow_blank=True)
    principal_office = serializers.CharField(required=False, allow_blank=True)
    litigation_authority_reference = serializers.CharField(max_length=150, required=False, allow_blank=True)
    nonprofit_form = serializers.ChoiceField(
        choices=NonProfitOrganizationClient.NonProfitForm.choices,
        required=False,
        allow_blank=True,
    )
    canonical_legal_form = serializers.CharField(max_length=80, required=False, allow_blank=True)
    pbo_or_ngo_status = serializers.CharField(max_length=100, required=False, allow_blank=True)
    operational_scope = serializers.CharField(required=False, allow_blank=True)
    funding_compliance_notes = serializers.CharField(required=False, allow_blank=True)

    # Trust.
    trust_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    trust_type = serializers.CharField(max_length=100, required=False, allow_blank=True)
    trust_deed_reference = serializers.CharField(max_length=100, required=False, allow_blank=True)
    trust_deed_date = serializers.DateField(required=False, allow_null=True)
    jurisdiction = serializers.CharField(max_length=100, required=False, allow_blank=True)
    purpose = serializers.CharField(required=False, allow_blank=True)
    principal_address = serializers.CharField(required=False, allow_blank=True)
    settlor_details = serializers.CharField(required=False, allow_blank=True)
    trustees = serializers.ListField(child=serializers.DictField(), required=False, default=list)

    # Estate.
    estate_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    deceased_full_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    deceased_id_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    date_of_death = serializers.DateField(required=False, allow_null=True)
    deceased_last_address = serializers.CharField(required=False, allow_blank=True)
    succession_cause_number = serializers.CharField(max_length=150, required=False, allow_blank=True)
    probate_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    court_reference = serializers.CharField(max_length=100, required=False, allow_blank=True)
    grant_type = serializers.CharField(max_length=50, required=False, allow_blank=True)
    grant_issue_date = serializers.DateField(required=False, allow_null=True)
    grant_confirmation_date = serializers.DateField(required=False, allow_null=True)
    grant_status = serializers.CharField(max_length=50, required=False, allow_blank=True)
    estate_value_estimate = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, allow_null=True)
    personal_representatives = serializers.ListField(child=serializers.DictField(), required=False, default=list)

    # Public entity.
    official_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    public_entity_subtype = serializers.ChoiceField(
        choices=PublicEntityClient.PublicEntitySubtype.choices,
        required=False,
        allow_blank=True,
    )
    enabling_instrument = serializers.CharField(max_length=255, required=False, allow_blank=True)
    parent_ministry_or_county = serializers.CharField(max_length=255, required=False, allow_blank=True)
    legal_capacity_notes = serializers.CharField(required=False, allow_blank=True)
    official_address = serializers.CharField(required=False, allow_blank=True)
    statutory_representative = serializers.CharField(max_length=255, required=False, allow_blank=True)
    jurisdiction_level = serializers.CharField(max_length=100, required=False, allow_blank=True)

    # International organization.
    organization_type = serializers.ChoiceField(
        choices=InternationalOrganizationClient.OrganizationType.choices,
        required=False,
        allow_blank=True,
    )
    founding_instrument = serializers.CharField(max_length=255, required=False, allow_blank=True)
    headquarters_country = serializers.CharField(max_length=100, required=False, allow_blank=True)
    kenya_recognition_details = serializers.CharField(required=False, allow_blank=True)
    privileges_immunities_status = serializers.CharField(required=False, allow_blank=True)
    kenya_office_address = serializers.CharField(required=False, allow_blank=True)

    representatives = ClientRepresentativeInputSerializer(many=True, required=False, default=list)

    def _strip_strings(self, attrs):
        for key, value in list(attrs.items()):
            if isinstance(value, str):
                attrs[key] = value.strip()
        for key in ["email", "contact_email"]:
            if attrs.get(key):
                attrs[key] = attrs[key].lower()
        for key in [
            "kra_pin",
            "business_kra_pin",
            "proprietor_kra_pin",
            "registration_number",
            "business_registration_number",
            "llp_registration_number",
        ]:
            if attrs.get(key):
                attrs[key] = attrs[key].upper()
        return attrs

    def _require(self, attrs, *fields):
        errors = {}
        for field in fields:
            if not attrs.get(field):
                errors[field] = "This field is required for this client type."
        if errors:
            raise serializers.ValidationError(errors)

    def _legal_name(self, attrs):
        client_type = attrs["client_type"]
        if client_type == Client.ClientType.SOLE_PROPRIETORSHIP:
            return attrs.get("registered_business_name") or attrs.get("legal_name")
        if client_type == Client.ClientType.PARTNERSHIP:
            return attrs.get("partnership_name") or attrs.get("legal_name")
        if client_type == Client.ClientType.LIMITED_LIABILITY_PARTNERSHIP:
            return attrs.get("registered_name") or attrs.get("legal_name")
        if client_type in {
            Client.ClientType.COOPERATIVE,
            Client.ClientType.SACCO,
            Client.ClientType.NON_PROFIT_ORGANIZATION,
            Client.ClientType.NGO,
        }:
            return attrs.get("registered_name") or attrs.get("legal_name")
        if client_type == Client.ClientType.SOCIETY_OR_ASSOCIATION:
            return attrs.get("legal_name")
        if client_type == Client.ClientType.TRUST:
            return attrs.get("trust_name")
        if client_type == Client.ClientType.ESTATE:
            return attrs.get("estate_name")
        if client_type in {
            Client.ClientType.PUBLIC_ENTITY,
            Client.ClientType.INTERNATIONAL_ORGANIZATION,
        }:
            return attrs.get("official_name") or attrs.get("legal_name")
        return attrs.get("legal_name")

    def validate(self, attrs):
        attrs = self._strip_strings(super().validate(attrs))
        client_type = attrs.get("client_type")
        firm = self.context.get("firm")

        if client_type not in CANONICAL_ENTITY_TYPES:
            raise serializers.ValidationError(
                {"client_type": "Use one of the canonical Kenyan legal-capacity client types."}
            )

        if attrs.get("registration_date") and attrs["registration_date"] > timezone.localdate():
            raise serializers.ValidationError({"registration_date": "Registration date cannot be in the future."})
        if attrs.get("formation_date") and attrs["formation_date"] > timezone.localdate():
            raise serializers.ValidationError({"formation_date": "Formation date cannot be in the future."})
        if attrs.get("date_of_death") and attrs["date_of_death"] > timezone.localdate():
            raise serializers.ValidationError({"date_of_death": "Date of death cannot be in the future."})

        if client_type == Client.ClientType.SOLE_PROPRIETORSHIP:
            self._require(
                attrs,
                "registered_business_name",
                "proprietor_name",
                "proprietor_identifier",
            )
        elif client_type == Client.ClientType.PARTNERSHIP:
            self._require(attrs, "partnership_name", "subtype")
            partners = attrs.get("partners") or []
            active_partners = [p for p in partners if p.get("is_active", True)]
            if len(active_partners) < 2:
                raise serializers.ValidationError(
                    {"partners": "At least two active partners are required for a partnership record."}
                )
            unidentified_partners = [
                partner
                for partner in active_partners
                if (
                    partner.get("partner_type")
                    or partner.get("partner_kind")
                    or "INDIVIDUAL"
                ) == "INDIVIDUAL"
                and not partner.get("identifier")
            ]
            if unidentified_partners:
                raise serializers.ValidationError(
                    {
                        "partners": (
                            "Record an ID or passport number for every active "
                            "individual partner."
                        )
                    }
                )
        elif client_type == Client.ClientType.LIMITED_LIABILITY_PARTNERSHIP:
            self._require(attrs, "registered_name", "llp_registration_number")
            partners = attrs.get("partners") or []
            active_partners = [p for p in partners if p.get("is_active", True)]
            if len(active_partners) < 2:
                raise serializers.ValidationError(
                    {"partners": "Record at least two active LLP partners."}
                )
            if not any(p.get("is_designated_partner") for p in active_partners):
                raise serializers.ValidationError(
                    {"partners": "Record at least one designated partner for an LLP."}
                )
            if any(
                (
                    partner.get("partner_type")
                    or partner.get("partner_kind")
                    or "INDIVIDUAL"
                ) == "INDIVIDUAL"
                and not partner.get("identifier")
                for partner in active_partners
            ):
                raise serializers.ValidationError(
                    {
                        "partners": (
                            "Record an ID or passport number for every active "
                            "individual LLP partner."
                        )
                    }
                )
        elif client_type in {
            Client.ClientType.COOPERATIVE,
            Client.ClientType.SACCO,
        }:
            self._require(attrs, "registered_name", "registration_number", "cooperative_subtype")
            if (
                client_type == Client.ClientType.SACCO
                and attrs.get("cooperative_subtype")
                != CooperativeClient.CooperativeSubtype.SACCO
            ):
                raise serializers.ValidationError(
                    {"cooperative_subtype": "A SACCO client must use the SACCO subtype."}
                )
            cooperative_officers = [
                representative
                for representative in attrs.get("representatives") or []
                if representative.get("representative_category")
                == ClientRepresentative.RepresentativeCategory.COOPERATIVE_OFFICER
            ]
            if not cooperative_officers:
                raise serializers.ValidationError(
                    {
                        "representatives": (
                            "Record at least one authorized cooperative officer."
                        )
                    }
                )
            if any(
                not officer.get("national_id_or_passport")
                for officer in cooperative_officers
            ):
                raise serializers.ValidationError(
                    {
                        "representatives": (
                            "Record an ID or passport number for every "
                            "authorized cooperative officer."
                        )
                    }
                )
        elif client_type == Client.ClientType.SOCIETY_OR_ASSOCIATION:
            self._require(attrs, "legal_name", "registration_status")
            association_officials = [
                representative
                for representative in attrs.get("representatives") or []
                if representative.get("representative_category")
                == ClientRepresentative.RepresentativeCategory.SOCIETY_OFFICIAL
            ]
            if not association_officials:
                raise serializers.ValidationError(
                    {
                        "representatives": (
                            "Record an authorized society or association official."
                        )
                    }
                )
            if any(
                not official.get("national_id_or_passport")
                for official in association_officials
            ):
                raise serializers.ValidationError(
                    {
                        "representatives": (
                            "Record an ID or passport number for every "
                            "authorized association official."
                        )
                    }
                )
        elif client_type in {
            Client.ClientType.NON_PROFIT_ORGANIZATION,
            Client.ClientType.NGO,
        }:
            self._require(attrs, "registered_name", "nonprofit_form")
            if (
                client_type == Client.ClientType.NGO
                and attrs.get("nonprofit_form")
                != NonProfitOrganizationClient.NonProfitForm.LEGACY_NGO_OR_TRANSITIONAL
            ):
                raise serializers.ValidationError(
                    {
                        "nonprofit_form": (
                            "An NGO client must use the NGO/transitional "
                            "non-profit form."
                        )
                    }
                )
            if client_type == Client.ClientType.NGO:
                ngo_officials = [
                    representative
                    for representative in attrs.get("representatives") or []
                    if representative.get("representative_category")
                    == ClientRepresentative.RepresentativeCategory.PBO_OFFICIAL
                ]
                if not ngo_officials:
                    raise serializers.ValidationError(
                        {"representatives": "Record an authorized NGO official."}
                    )
                if any(
                    not official.get("national_id_or_passport")
                    for official in ngo_officials
                ):
                    raise serializers.ValidationError(
                        {
                            "representatives": (
                                "Record an ID or passport number for every "
                                "authorized NGO official."
                            )
                        }
                    )
        elif client_type == Client.ClientType.TRUST:
            self._require(attrs, "trust_name", "trust_type")
            trustees = attrs.get("trustees") or []
            if not trustees:
                raise serializers.ValidationError({"trustees": "Record at least one trustee."})
            if any(
                trustee.get("trustee_type", "INDIVIDUAL") == "INDIVIDUAL"
                and not trustee.get("identifier")
                for trustee in trustees
            ):
                raise serializers.ValidationError(
                    {
                        "trustees": (
                            "Record an ID or passport number for every "
                            "individual trustee."
                        )
                    }
                )
        elif client_type == Client.ClientType.ESTATE:
            self._require(attrs, "estate_name", "deceased_full_name")
            personal_representatives = attrs.get("personal_representatives") or []
            if not personal_representatives:
                raise serializers.ValidationError(
                    {
                        "personal_representatives": (
                            "Record at least one executor, administrator, or "
                            "other lawful personal representative."
                        )
                    }
                )
            if any(
                not representative.get("identifier")
                for representative in personal_representatives
            ):
                raise serializers.ValidationError(
                    {
                        "personal_representatives": (
                            "Record an ID or passport number for every "
                            "personal representative."
                        )
                    }
                )
        elif client_type == Client.ClientType.PUBLIC_ENTITY:
            self._require(attrs, "official_name", "public_entity_subtype")
            public_officers = [
                representative
                for representative in attrs.get("representatives") or []
                if representative.get("representative_category")
                in {
                    ClientRepresentative.RepresentativeCategory.AUTHORIZED_PUBLIC_OFFICER,
                    ClientRepresentative.RepresentativeCategory.COUNTY_ATTORNEY,
                    ClientRepresentative.RepresentativeCategory.ATTORNEY_GENERAL_REPRESENTATIVE,
                }
            ]
            if not public_officers:
                raise serializers.ValidationError(
                    {"representatives": "Record an authorized public officer."}
                )
            if any(
                not officer.get("national_id_or_passport")
                for officer in public_officers
            ):
                raise serializers.ValidationError(
                    {
                        "representatives": (
                            "Record an ID or passport number for every "
                            "authorized public officer."
                        )
                    }
                )
        elif client_type == Client.ClientType.INTERNATIONAL_ORGANIZATION:
            self._require(attrs, "official_name", "organization_type")

        legal_name = self._legal_name(attrs)
        if not legal_name:
            raise serializers.ValidationError({"legal_name": "A legal display name is required."})
        attrs["full_name"] = legal_name

        if firm:
            registration_number = (
                attrs.get("registration_number")
                or attrs.get("business_registration_number")
                or attrs.get("llp_registration_number")
            )
            if registration_number:
                exists = Client.objects.filter(
                    firm=firm,
                    client_type=client_type,
                    full_name__iexact=legal_name,
                ).exists()
                if exists:
                    raise serializers.ValidationError(
                        {"registration_number": "A client with this legal name and type already exists in this firm."}
                    )

        if attrs.get("access_type") not in {Client.AccessType.PORTAL_ENABLED, Client.AccessType.ASSISTED}:
            raise serializers.ValidationError({"access_type": "Use PORTAL_ENABLED or ASSISTED."})

        if attrs.get("access_type") == Client.AccessType.PORTAL_ENABLED:
            errors = {}
            if not attrs.get("email"):
                errors["email"] = "Portal access requires the authorized contact email."
            elif User.objects.filter(email__iexact=attrs["email"]).exists():
                errors["email"] = "A user account with this email already exists."
            if not (attrs.get("contact_full_name") or any(r.get("is_portal_contact") for r in attrs.get("representatives", []))):
                errors["contact_full_name"] = "Portal access requires an authorized human contact."
            if errors:
                raise serializers.ValidationError(errors)

        return attrs
