from rest_framework import serializers

from apps.cases.models import CaseFiling


class CaseFilingSerializer(serializers.ModelSerializer):
    filing_type_label = serializers.CharField(source="get_filing_type_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = CaseFiling
        fields = [
            "id",
            "filing_type",
            "filing_type_label",
            "status",
            "status_label",
            "title",
            "description",
            "filed_at",
            "served_at",
            "official_court_case_number",
            "efiling_reference",
            "assessment_reference",
            "court_fee_amount",
            "payment_reference",
            "payment_date",
            "receipt_number",
            "source",
            "is_client_visible",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
