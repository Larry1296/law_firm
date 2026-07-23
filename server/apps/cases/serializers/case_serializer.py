from rest_framework import serializers

from apps.cases.models import Case


class CaseSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    plaintiff_name = serializers.SerializerMethodField()
    case_owner = serializers.SerializerMethodField()
    client_national_id = serializers.CharField(source="client.national_id", read_only=True)
    assigned_lawyer_name = serializers.CharField(source="assigned_lawyer.user.full_name", read_only=True)
    assigned_secretary_name = serializers.CharField(source="assigned_secretary.user.full_name", read_only=True)
    entry_route_label = serializers.CharField(source="get_entry_route_display", read_only=True)
    practice_area_label = serializers.CharField(source="get_practice_area_display", read_only=True)
    matter_nature_label = serializers.CharField(source="get_matter_nature_display", read_only=True)
    forum_label = serializers.CharField(source="get_forum_display", read_only=True)
    procedure_type_label = serializers.CharField(source="get_procedure_type_display", read_only=True)
    matter_status_label = serializers.CharField(source="get_matter_status_display", read_only=True)
    court_stage_label = serializers.CharField(source="get_court_stage_display", read_only=True)

    def get_plaintiff_name(self, obj):
        return obj.plaintiff or obj.client.full_name

    def get_case_owner(self, obj):
        party = obj.parties.filter(client=obj.client, is_our_client=True).first()
        return {
            "id": str(obj.client.id),
            "full_name": party.name if party else obj.plaintiff or obj.client.full_name,
            "email": obj.client.email,
            "phone_number": obj.client.phone_number,
            "party_role": party.party_role if party else "PLAINTIFF",
            "party_role_label": party.get_party_role_display() if party else "Plaintiff",
            "client_id": str(obj.client.id),
        }

    class Meta:
        model = Case
        fields = [
            "id",
            "case_number",
            "official_court_case_number",
            "title",
            "description",
            "entry_route",
            "entry_route_label",
            "practice_area",
            "practice_area_label",
            "matter_nature",
            "matter_nature_label",
            "forum",
            "forum_label",
            "case_type",
            "procedure_track",
            "procedure_type",
            "procedure_type_label",
            "status",
            "matter_status",
            "matter_status_label",
            "court_stage",
            "court_stage_label",
            "outcome_status",
            "enforcement_status",
            "appeal_status",
            "priority",
            "date_instructions_received",
            "urgency_level",
            "limitation_date",
            "internal_deadline",
            "conflict_status",
            "court_type",
            "court_division",
            "court_name",
            "court_station",
            "registry",
            "courtroom",
            "judicial_officer",
            "court_location",
            "efiling_reference",
            "cts_reference",
            "payment_reference",
            "filing_date",
            "next_court_date",
            "next_action",
            "plaintiff",
            "defendant",
            "client",
            "client_name",
            "plaintiff_name",
            "case_owner",
            "client_national_id",
            "assigned_lawyer",
            "assigned_lawyer_name",
            "assigned_secretary",
            "assigned_secretary_name",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
