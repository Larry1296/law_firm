from rest_framework import serializers

from apps.cases.models import Case, CaseFiling

# The ELRC (Procedure) Rules, 2024 call the respondent's answer a response (rule 29(1)) and the
# claimant's answer to it a reply (rule 29(3)); the filing register form uses the same names.
ELRC_FILING_LABELS = {
    CaseFiling.FilingType.DEFENCE: "Response",
    CaseFiling.FilingType.REPLY_TO_DEFENCE: "Reply to response",
    CaseFiling.FilingType.REQUEST_FOR_JUDGMENT: "Request for judgment in default of a response",
}


class CaseFilingSerializer(serializers.ModelSerializer):
    filing_type_label = serializers.SerializerMethodField()
    status_label = serializers.SerializerMethodField()
    filed_by_party_name = serializers.CharField(source="filed_by_party.name", read_only=True, default="")
    filed_by_adverse = serializers.BooleanField(source="filed_by_party.is_adverse", read_only=True, default=False)

    def get_filing_type_label(self, obj):
        if obj.case.procedure_track == Case.ProcedureTrack.EMPLOYMENT_CLAIM and obj.filing_type in ELRC_FILING_LABELS:
            return ELRC_FILING_LABELS[obj.filing_type]
        return obj.get_filing_type_display()

    def get_status_label(self, obj):
        # A demand letter is sent to the other side, not served on it through the court.
        if obj.filing_type == CaseFiling.FilingType.DEMAND_LETTER and obj.status == CaseFiling.FilingStatus.SERVED:
            return "Issued"
        return obj.get_status_display()

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
            "filed_by_party",
            "filed_by_party_name",
            "served_filing",
            "filed_by_adverse",
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
    response_due_date = serializers.DateField(required=False, allow_null=True)
    efiling_reference = serializers.CharField(max_length=120, required=False, allow_blank=True)
    court_fee_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    payment_reference = serializers.CharField(max_length=120, required=False, allow_blank=True)
    payment_date = serializers.DateField(required=False, allow_null=True)
    receipt_number = serializers.CharField(max_length=120, required=False, allow_blank=True)
    filed_by_party = serializers.UUIDField(required=False, allow_null=True)
    served_filing = serializers.UUIDField(required=False, allow_null=True)
    is_client_visible = serializers.BooleanField(required=False, default=True)


class CaseFilingCorrectionSerializer(serializers.Serializer):
    filed_by_party = serializers.UUIDField(required=False, allow_null=True)
    title = serializers.CharField(required=False, allow_blank=True, max_length=255)
    efiling_reference = serializers.CharField(required=False, allow_blank=True, max_length=120)
    reason = serializers.CharField()
