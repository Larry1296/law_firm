from rest_framework import serializers

from apps.clients.models import Client


class ClientAdminListSerializer(serializers.ModelSerializer):
    company_name = serializers.SerializerMethodField()
    trading_name = serializers.SerializerMethodField()
    registration_number = serializers.SerializerMethodField()
    company_type = serializers.SerializerMethodField()
    incorporation_date = serializers.SerializerMethodField()
    country_of_incorporation = serializers.SerializerMethodField()
    industry = serializers.SerializerMethodField()
    nature_of_business = serializers.SerializerMethodField()
    website = serializers.SerializerMethodField()
    company_status = serializers.SerializerMethodField()
    director_count = serializers.SerializerMethodField()
    employee_count = serializers.SerializerMethodField()
    beneficial_ownership_declared = serializers.SerializerMethodField()
    annual_returns_up_to_date = serializers.SerializerMethodField()
    compliance_notes = serializers.SerializerMethodField()
    preferred_name = serializers.SerializerMethodField()
    gender = serializers.SerializerMethodField()
    marital_status = serializers.SerializerMethodField()
    occupation = serializers.SerializerMethodField()
    employer = serializers.SerializerMethodField()
    nationality = serializers.SerializerMethodField()
    primary_address = serializers.SerializerMethodField()
    next_of_kin = serializers.SerializerMethodField()
    portal_access_exists = serializers.SerializerMethodField()
    portal_login_email = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    primary_contact = serializers.SerializerMethodField()
    primary_contact_name = serializers.SerializerMethodField()
    has_cases = serializers.BooleanField(read_only=True)
    can_hard_delete = serializers.BooleanField(read_only=True)
    can_archive = serializers.BooleanField(read_only=True)
    can_restore = serializers.BooleanField(read_only=True)

    class Meta:
        model = Client
        fields = (
            "id",
            "full_name",
            "email",
            "phone_number",
            "national_id",
            "passport_number",
            "kra_pin",
            "date_of_birth",
            "client_type",
            "access_type",
            "lifecycle_status",
            "company_name",
            "trading_name",
            "registration_number",
            "company_type",
            "incorporation_date",
            "country_of_incorporation",
            "industry",
            "nature_of_business",
            "website",
            "company_status",
            "director_count",
            "employee_count",
            "beneficial_ownership_declared",
            "annual_returns_up_to_date",
            "compliance_notes",
            "preferred_name",
            "gender",
            "marital_status",
            "occupation",
            "employer",
            "nationality",
            "primary_address",
            "next_of_kin",
            "portal_access_exists",
            "portal_login_email",
            "primary_contact",
            "primary_contact_name",
            "is_verified",
            "is_active",
            "created_by",
            "created_by_name",
            "has_cases",
            "can_hard_delete",
            "can_archive",
            "can_restore",
            "soft_deleted_at",
            "created_at",
        )
        read_only_fields = fields

    def _company_profile(self, obj):
        return getattr(obj, "company_profile", None)

    def _company_value(self, obj, field):
        profile = self._company_profile(obj)
        return getattr(profile, field, None) if profile else None

    def _individual_profile(self, obj):
        return getattr(obj, "individual_profile", None)

    def _individual_value(self, obj, field):
        profile = self._individual_profile(obj)
        return getattr(profile, field, None) if profile else None

    def get_company_name(self, obj):
        return self._company_value(obj, "company_name")

    def get_trading_name(self, obj):
        return self._company_value(obj, "trading_name")

    def get_registration_number(self, obj):
        return self._company_value(obj, "registration_number")

    def get_company_type(self, obj):
        return self._company_value(obj, "company_type")

    def get_incorporation_date(self, obj):
        return self._company_value(obj, "incorporation_date")

    def get_country_of_incorporation(self, obj):
        return self._company_value(obj, "country_of_incorporation")

    def get_industry(self, obj):
        return self._company_value(obj, "industry")

    def get_nature_of_business(self, obj):
        return self._company_value(obj, "nature_of_business")

    def get_website(self, obj):
        return self._company_value(obj, "website")

    def get_company_status(self, obj):
        return self._company_value(obj, "company_status")

    def get_director_count(self, obj):
        return self._company_value(obj, "director_count")

    def get_employee_count(self, obj):
        return self._company_value(obj, "employee_count")

    def get_beneficial_ownership_declared(self, obj):
        return self._company_value(obj, "beneficial_ownership_declared")

    def get_annual_returns_up_to_date(self, obj):
        return self._company_value(obj, "annual_returns_up_to_date")

    def get_compliance_notes(self, obj):
        return self._company_value(obj, "compliance_notes")

    def get_preferred_name(self, obj):
        return self._individual_value(obj, "preferred_name")

    def get_gender(self, obj):
        return self._individual_value(obj, "gender")

    def get_marital_status(self, obj):
        return self._individual_value(obj, "marital_status")

    def get_occupation(self, obj):
        return self._individual_value(obj, "occupation")

    def get_employer(self, obj):
        return self._individual_value(obj, "employer")

    def get_nationality(self, obj):
        return self._individual_value(obj, "nationality")

    def _primary_address(self, obj):
        return obj.addresses.order_by("-is_primary", "-created_at").first()

    def get_primary_address(self, obj):
        address = self._primary_address(obj)
        if not address:
            return None
        return {
            "id": str(address.id),
            "address_type": address.address_type,
            "country": address.country,
            "county": address.county,
            "city": address.city,
            "street": address.street,
            "postal_code": address.postal_code,
            "full_address": address.full_address,
            "is_primary": address.is_primary,
        }

    def get_next_of_kin(self, obj):
        contact = obj.contacts.filter(contact_type="EMERGENCY").order_by("-created_at").first()
        if not contact:
            return None
        return {
            "id": str(contact.id),
            "full_name": contact.full_name,
            "phone_number": contact.phone_number,
            "email": contact.email,
            "role_or_designation": contact.role_or_designation,
            "contact_type": contact.contact_type,
        }

    def get_portal_access_exists(self, obj):
        return bool(obj.user_id)

    def get_portal_login_email(self, obj):
        return obj.user.email if obj.user_id else None

    def get_created_by_name(self, obj):
        return obj.created_by.full_name if obj.created_by_id else None

    def _primary_contact(self, obj):
        return obj.contacts.filter(is_primary=True).order_by("-created_at").first()

    def get_primary_contact(self, obj):
        contact = self._primary_contact(obj)
        if not contact:
            return None
        return {
            "id": str(contact.id),
            "full_name": contact.full_name,
            "phone_number": contact.phone_number,
            "email": contact.email,
            "role_or_designation": contact.role_or_designation,
            "contact_type": contact.contact_type,
            "preferred_channel": contact.preferred_channel,
            "is_primary": contact.is_primary,
            "is_verified": contact.is_verified,
        }

    def get_primary_contact_name(self, obj):
        contact = self._primary_contact(obj)
        return contact.full_name if contact else ""
