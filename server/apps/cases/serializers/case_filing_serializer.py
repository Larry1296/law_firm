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
            "response_due_date",
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


class CaseFilingRecordSerializer(serializers.Serializer):
    filing_type = serializers.ChoiceField(choices=CaseFiling.FilingType.choices)
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    filed_at = serializers.DateTimeField(required=False, allow_null=True)
    served_at = serializers.DateTimeField(required=False, allow_null=True)
    response_period_days = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    efiling_reference = serializers.CharField(max_length=120, required=False, allow_blank=True)
    court_fee_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    payment_reference = serializers.CharField(max_length=120, required=False, allow_blank=True)
    payment_date = serializers.DateField(required=False, allow_null=True)
    receipt_number = serializers.CharField(max_length=120, required=False, allow_blank=True)
    is_client_visible = serializers.BooleanField(required=False, default=True)
