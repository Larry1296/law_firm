from rest_framework import serializers

from apps.cases.models import Case


class CaseJurisdictionActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["VERIFY", "REVOKE"])
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

    def validate_currency(self, value):
        value = (value or "KES").strip().upper()
        if len(value) != 3 or not value.isalpha():
            raise serializers.ValidationError("Currency must be a three-letter code.")
        return value

    def validate(self, attrs):
        if attrs["action"] == "REVOKE" and not (attrs.get("reason") or "").strip():
            raise serializers.ValidationError({"reason": "A reason is required to revoke verification."})
        return attrs
