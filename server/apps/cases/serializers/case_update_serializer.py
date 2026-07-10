from rest_framework import serializers

from apps.cases.models import Case


class CaseUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Case
        fields = [
            "title",
            "description",
            "case_type",
            "court_type",
            "status",
            "priority",
            "filing_date",
            "court_name",
            "court_location",
            "plaintiff",
            "defendant",
            "is_active",
        ]
