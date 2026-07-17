from rest_framework import serializers

from apps.cases.models import Case
from apps.cases.serializers.case_status_serializer import CaseNextEventSerializer


class CaseUpdateSerializer(serializers.ModelSerializer):
    next_event = CaseNextEventSerializer(required=False, allow_null=True, write_only=True)

    class Meta:
        model = Case
        fields = [
            "title",
            "description",
            "case_type",
            "procedure_track",
            "court_type",
            "court_division",
            "priority",
            "court_name",
            "court_station",
            "registry",
            "courtroom",
            "judicial_officer",
            "court_location",
            "claim_amount",
            "currency",
            "court_level",
            "judicial_officer_rank",
            "jurisdiction_notes",
            "next_court_date",
            "next_action",
            "plaintiff",
            "defendant",
            "next_event",
        ]

    def validate(self, attrs):
        controlled_fields = {
            "status",
            "matter_status",
            "court_stage",
            "outcome_status",
            "enforcement_status",
            "appeal_status",
            "filing_date",
            "official_court_case_number",
            "efiling_reference",
            "cts_reference",
            "payment_reference",
            "assessment_reference",
            "court_fee_amount",
            "payment_date",
            "jurisdiction_verified",
            "jurisdiction_verified_by",
            "jurisdiction_verified_at",
        }
        supplied = [field for field in controlled_fields if field in self.initial_data]
        if supplied:
            raise serializers.ValidationError(
                {
                    field: (
                        "This field is controlled by the lifecycle, filing or "
                        "jurisdiction verification workflow."
                    )
                    for field in supplied
                }
            )
        return attrs
