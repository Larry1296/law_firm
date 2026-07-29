from rest_framework import serializers

from apps.cases.models import Case
from apps.common.choices import JurisdictionStatus


class CaseJurisdictionActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["VERIFY", "REVIEW", "REVOKE", "VERIFY_CTS"])
    reason = serializers.CharField(required=False, allow_blank=True)
    claim_amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        required=False,
        allow_null=True,
        min_value=0,
    )
    currency = serializers.CharField(max_length=3, required=False, allow_blank=True)
    court_level = serializers.CharField(max_length=80, required=False, allow_blank=True)
    court_type = serializers.ChoiceField(choices=Case.CourtType.choices, required=False)
    court_station = serializers.CharField(max_length=255, required=False, allow_blank=True)
    judicial_officer_rank = serializers.CharField(max_length=80, required=False, allow_blank=True)
    jurisdiction_notes = serializers.CharField(required=False, allow_blank=True)
    cts_reference = serializers.CharField(max_length=120, required=False, allow_blank=True)
    verification_source = serializers.CharField(max_length=255, required=False, allow_blank=True)
    official_case_number = serializers.CharField(max_length=120, required=False, allow_blank=True)
    efiling_reference = serializers.CharField(max_length=120, required=False, allow_blank=True)
    judiciary_status = serializers.CharField(max_length=255, required=False, allow_blank=True)
    latest_official_court_date = serializers.DateTimeField(required=False, allow_null=True)
    subject_matter_basis = serializers.CharField(required=False, allow_blank=True)
    pecuniary_basis = serializers.CharField(required=False, allow_blank=True)
    territorial_basis = serializers.CharField(required=False, allow_blank=True)
    legal_basis = serializers.CharField(required=False, allow_blank=True)
    trigger = serializers.CharField(required=False, allow_blank=True)
    assessment = serializers.CharField(required=False, allow_blank=True)
    date_raised = serializers.DateTimeField(required=False, allow_null=True)
    raised_by = serializers.CharField(max_length=255, required=False, allow_blank=True)
    jurisdiction_status = serializers.ChoiceField(choices=JurisdictionStatus.choices, required=False)
    court_directions_or_ruling = serializers.CharField(required=False, allow_blank=True)
    previous_court = serializers.CharField(max_length=255, required=False, allow_blank=True)
    new_court = serializers.CharField(max_length=255, required=False, allow_blank=True)
    new_station = serializers.CharField(max_length=255, required=False, allow_blank=True)
    effective_date = serializers.DateField(required=False, allow_null=True)
    supporting_document_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, allow_empty=True
    )

    def validate_currency(self, value):
        value = (value or "KES").strip().upper()
        if len(value) != 3 or not value.isalpha():
            raise serializers.ValidationError("Currency must be a three-letter code.")
        return value

    def validate(self, attrs):
        action = attrs["action"]
        if action == "REVOKE" and not (attrs.get("reason") or "").strip():
            raise serializers.ValidationError({"reason": "A reason is required to revoke verification."})
        if action == "VERIFY_CTS":
            errors = {}
            if not (attrs.get("cts_reference") or "").strip():
                errors["cts_reference"] = "CTS reference is required."
            if not (attrs.get("verification_source") or "").strip():
                errors["verification_source"] = "Verification source is required."
            if not (attrs.get("reason") or "").strip():
                errors["reason"] = "A reason is required to verify the CTS reference."
            if errors:
                raise serializers.ValidationError(errors)
        if action == "REVIEW":
            errors = {}
            for field in ("trigger", "assessment", "jurisdiction_status"):
                if not attrs.get(field):
                    errors[field] = "This field is required for a jurisdiction review."
            if errors:
                raise serializers.ValidationError(errors)
        return attrs
