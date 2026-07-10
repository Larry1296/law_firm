from rest_framework import serializers

from apps.firm.models import LawFirm


class LawFirmSerializer(serializers.ModelSerializer):
    owner_email = serializers.CharField(source="owner.email", read_only=True)
    owner_name = serializers.CharField(source="owner.full_name", read_only=True)
    owner_user_role = serializers.CharField(source="owner.role", read_only=True)
    owner_firm_role = serializers.SerializerMethodField()
    owner_is_registered_lawyer = serializers.SerializerMethodField()
    owner_lawyer_id = serializers.SerializerMethodField()
    owner_lawyer_admission_number = serializers.SerializerMethodField()

    def get_owner_firm_role(self, obj):
        membership = obj.members.filter(user=obj.owner, is_active=True).first()
        return membership.role if membership else None

    def get_owner_is_registered_lawyer(self, obj):
        lawyer = getattr(obj.owner, "lawyer_profile", None)
        return bool(lawyer and lawyer.law_firm_id == obj.id and lawyer.is_active)

    def get_owner_lawyer_id(self, obj):
        lawyer = getattr(obj.owner, "lawyer_profile", None)
        if lawyer and lawyer.law_firm_id == obj.id:
            return lawyer.id
        return None

    def get_owner_lawyer_admission_number(self, obj):
        lawyer = getattr(obj.owner, "lawyer_profile", None)
        if lawyer and lawyer.law_firm_id == obj.id:
            return lawyer.admission_number
        return None

    class Meta:
        model = LawFirm
        fields = [
            "id",
            "name",
            "registration_number",
            "kra_pin",
            "email",
            "phone_number",
            "website",
            "physical_address",
            "postal_address",
            "description",
            "logo",
            "is_active",
            "owner_email",
            "owner_name",
            "owner_user_role",
            "owner_firm_role",
            "owner_is_registered_lawyer",
            "owner_lawyer_id",
            "owner_lawyer_admission_number",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "registration_number",
            "owner_email",
            "owner_name",
            "owner_user_role",
            "owner_firm_role",
            "owner_is_registered_lawyer",
            "owner_lawyer_id",
            "owner_lawyer_admission_number",
            "created_at",
        ]
