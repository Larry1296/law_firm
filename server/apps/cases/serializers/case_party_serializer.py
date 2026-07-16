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
            "name",
            "party_role",
            "role_label",
            "party_type",
            "type_label",
            "is_our_client",
            "party_order",
            "advocate_on_record",
            "law_firm",
            "phone_number",
            "email",
            "national_id",
            "kra_pin",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
