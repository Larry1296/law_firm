from rest_framework import serializers

from apps.cases.models import Case


class CaseSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    client_national_id = serializers.CharField(source="client.national_id", read_only=True)
    assigned_lawyer_name = serializers.CharField(source="assigned_lawyer.user.full_name", read_only=True)
    assigned_secretary_name = serializers.CharField(source="assigned_secretary.user.full_name", read_only=True)

    class Meta:
        model = Case
        fields = [
            "id",
            "case_number",
            "title",
            "description",
            "case_type",
            "status",
            "priority",
            "court_type",
            "court_name",
            "court_location",
            "filing_date",
            "plaintiff",
            "defendant",
            "client",
            "client_name",
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
