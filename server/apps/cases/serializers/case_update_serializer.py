from rest_framework import serializers

from apps.cases.models import Case


class CaseUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Case
        fields = [
            "title",
            "description",
            "case_type",
            "procedure_track",
            "court_type",
            "court_division",
            "status",
            "priority",
            "filing_date",
            "court_name",
            "court_station",
            "registry",
            "courtroom",
            "judicial_officer",
            "court_location",
            "efiling_reference",
            "cts_reference",
            "payment_reference",
            "next_court_date",
            "next_action",
            "plaintiff",
            "defendant",
            "is_active",
        ]
