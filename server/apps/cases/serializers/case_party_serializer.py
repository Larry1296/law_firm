from rest_framework import serializers

from apps.cases.models import CaseParty


class CasePartySerializer(serializers.ModelSerializer):
    role_label = serializers.CharField(source="get_party_role_display", read_only=True)
    type_label = serializers.CharField(source="get_party_type_display", read_only=True)

    class Meta:
        model = CaseParty
        fields = [
            "id",
            "client",
            "linked_contact",
            "name",
            "individual_name",
            "organization_name",
            "party_role",
            "role_label",
            "party_type",
            "type_label",
            "is_our_client",
            "is_adverse",
            "party_order",
            "identifier",
            "advocate_on_record",
            "law_firm",
            "representation_status",
            "phone_number",
            "email",
            "address",
            "national_id",
            "kra_pin",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
