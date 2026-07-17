from rest_framework import serializers

from apps.cases.models import Case


class CaseCreateSerializer(serializers.Serializer):
    client_id = serializers.UUIDField()
    assigned_lawyer_membership_id = serializers.UUIDField(required=False, allow_null=True)
    assigned_secretary_membership_id = serializers.UUIDField(required=False, allow_null=True)
    case_number = serializers.CharField(max_length=60, required=False, allow_blank=True)
    official_court_case_number = serializers.CharField(max_length=120)
    filing_date = serializers.DateField()
    efiling_reference = serializers.CharField(max_length=120)
    payment_reference = serializers.CharField(max_length=120, required=False, allow_blank=True)
    assessment_reference = serializers.CharField(max_length=120, required=False, allow_blank=True)
    court_fee_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True, min_value=0)
    payment_date = serializers.DateField(required=False, allow_null=True)
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    case_type = serializers.ChoiceField(choices=Case.CaseType.choices)
    procedure_track = serializers.ChoiceField(choices=Case.ProcedureTrack.choices, required=False, allow_blank=True)
    court_type = serializers.ChoiceField(choices=Case.CourtType.choices)
    court_division = serializers.ChoiceField(choices=Case.CourtDivision.choices, required=False, allow_blank=True)
    priority = serializers.ChoiceField(choices=Case.Priority.choices, required=False)
    court_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    court_station = serializers.CharField(max_length=255, required=False, allow_blank=True)
    registry = serializers.CharField(max_length=255, required=False, allow_blank=True)
    courtroom = serializers.CharField(max_length=100, required=False, allow_blank=True)
    judicial_officer = serializers.CharField(max_length=255, required=False, allow_blank=True)
    court_location = serializers.CharField(max_length=255, required=False, allow_blank=True)
    claim_amount = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, allow_null=True, min_value=0)
    currency = serializers.CharField(max_length=3, required=False, allow_blank=True, default="KES")
    court_level = serializers.CharField(max_length=80, required=False, allow_blank=True)
    jurisdiction_notes = serializers.CharField(required=False, allow_blank=True)
    next_court_date = serializers.DateTimeField(required=False, allow_null=True)
    next_action = serializers.CharField(max_length=255, required=False, allow_blank=True)
    plaintiff = serializers.CharField(max_length=255, required=False, allow_blank=True)
    defendant = serializers.CharField(max_length=255, required=False, allow_blank=True)
    client_party_role = serializers.CharField(max_length=40, required=False, allow_blank=True)

    def validate_currency(self, value):
        value = (value or "KES").strip().upper()
        if len(value) != 3 or not value.isalpha():
            raise serializers.ValidationError("Currency must be a three-letter code.")
        return value

    def validate(self, attrs):
        unsafe_fields = {
            "status",
            "matter_status",
            "court_stage",
            "outcome_status",
            "enforcement_status",
            "appeal_status",
            "jurisdiction_verified",
            "jurisdiction_verified_by",
            "jurisdiction_verified_at",
            "filed_by",
            "cts_reference",
        }
        supplied = [field for field in unsafe_fields if field in self.initial_data]
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
        official_number = (attrs.get("official_court_case_number") or "").strip()
        if not official_number:
            raise serializers.ValidationError(
                {"official_court_case_number": "Official court case number is required for filed-case registration."}
            )
        attrs["official_court_case_number"] = official_number
        firm = self.context.get("firm")
        if firm and Case.objects.filter(
            firm=firm,
            official_court_case_number__iexact=official_number,
        ).exists():
            raise serializers.ValidationError(
                {"official_court_case_number": "A case with this official court case number already exists."}
            )

        efiling_reference = (attrs.get("efiling_reference") or "").strip()
        if not efiling_reference:
            raise serializers.ValidationError(
                {"efiling_reference": "eFiling reference is required for filed-case registration."}
            )
        attrs["efiling_reference"] = efiling_reference

        if not (attrs.get("court_station") or attrs.get("court_name")):
            raise serializers.ValidationError(
                {"court_station": "Court station or court identification is required for filed-case registration."}
            )
        attrs["currency"] = attrs.get("currency") or "KES"
        return attrs
