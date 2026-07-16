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
    portal_access_exists = serializers.SerializerMethodField()
    portal_login_email = serializers.SerializerMethodField()
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
            "kra_pin",
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
            "portal_access_exists",
            "portal_login_email",
            "is_verified",
            "is_active",
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

    def get_portal_access_exists(self, obj):
        return bool(obj.user_id)

    def get_portal_login_email(self, obj):
        return obj.user.email if obj.user_id else None
