from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import serializers

from apps.cases.models import Case


CONTROLLED_CREATE_FIELDS = {
    "status",
    "matter_status",
    "court_stage",
    "outcome_status",
    "enforcement_status",
    "appeal_status",
    "case_number",
    "jurisdiction_verified",
    "jurisdiction_verified_by",
    "jurisdiction_verified_at",
    "filed_by",
    "created_by",
    "approved_by",
    "approved_at",
    "cts_reference",
}


class CaseCreateSerializer(serializers.Serializer):
    client_id = serializers.UUIDField()
    conflict_check_id = serializers.UUIDField()
    assigned_lawyer_membership_id = serializers.UUIDField(required=False, allow_null=True)
    assigned_secretary_membership_id = serializers.UUIDField(required=False, allow_null=True)

    entry_route = serializers.ChoiceField(
        choices=Case.EntryRoute.choices,
        required=False,
        default=Case.EntryRoute.NEW_INSTRUCTION,
    )
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    practice_area = serializers.ChoiceField(
        choices=Case.PracticeArea.choices,
        required=False,
        default=Case.PracticeArea.LEGACY,
    )
    matter_nature = serializers.ChoiceField(
        choices=Case.MatterNature.choices,
        required=False,
        default=Case.MatterNature.CONTENTIOUS,
    )
    forum = serializers.ChoiceField(
        choices=Case.Forum.choices,
        required=False,
        default=Case.Forum.COURT,
    )
    case_type = serializers.ChoiceField(choices=Case.CaseType.choices)
    procedure_type = serializers.ChoiceField(choices=Case.ProcedureTrack.choices, required=False, allow_blank=True)
    procedure_track = serializers.ChoiceField(choices=Case.ProcedureTrack.choices, required=False, allow_blank=True)
    priority = serializers.ChoiceField(choices=Case.Priority.choices, required=False)
    date_instructions_received = serializers.DateField(required=False, allow_null=True)
    urgency_level = serializers.CharField(max_length=30, required=False, allow_blank=True)
    urgency_reason = serializers.CharField(required=False, allow_blank=True)
    limitation_date = serializers.DateField(required=False, allow_null=True)
    internal_deadline = serializers.DateField(required=False, allow_null=True)
    client_party_role = serializers.CharField(max_length=40, required=False, allow_blank=True)

    parties = serializers.ListField(child=serializers.DictField(), required=False)
    court_proceeding = serializers.DictField(required=False)
    tribunal_proceeding = serializers.DictField(required=False)
    arbitration_proceeding = serializers.DictField(required=False)
    non_contentious_details = serializers.DictField(required=False)
    land_details = serializers.DictField(required=False)
    succession_details = serializers.DictField(required=False)
    insurance_details = serializers.DictField(required=False)
    employment_details = serializers.DictField(required=False)
    criminal_details = serializers.DictField(required=False)
    monetary_relief = serializers.DictField(required=False)

    # Backward-compatible flat fields used by the prior filed-case create flow.
    official_court_case_number = serializers.CharField(max_length=120, required=False, allow_blank=True)
    filing_date = serializers.DateField(required=False, allow_null=True)
    filing_channel = serializers.CharField(max_length=40, required=False, allow_blank=True)
    efiling_reference = serializers.CharField(max_length=120, required=False, allow_blank=True)
    payment_reference = serializers.CharField(max_length=120, required=False, allow_blank=True)
    assessment_reference = serializers.CharField(max_length=120, required=False, allow_blank=True)
    assessment_date = serializers.DateField(required=False, allow_null=True)
    court_fee_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True, min_value=0)
    payment_completed = serializers.BooleanField(required=False, default=False)
    payment_date = serializers.DateField(required=False, allow_null=True)
    court_type = serializers.ChoiceField(choices=Case.CourtType.choices, required=False, allow_blank=True)
    court_division = serializers.ChoiceField(choices=Case.CourtDivision.choices, required=False, allow_blank=True)
    court_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    court_station = serializers.CharField(max_length=255, required=False, allow_blank=True)
    registry = serializers.CharField(max_length=255, required=False, allow_blank=True)
    courtroom = serializers.CharField(max_length=100, required=False, allow_blank=True)
    judicial_officer = serializers.CharField(max_length=255, required=False, allow_blank=True)
    court_location = serializers.CharField(max_length=255, required=False, allow_blank=True)
    court_level = serializers.CharField(max_length=80, required=False, allow_blank=True)
    jurisdiction_notes = serializers.CharField(required=False, allow_blank=True)
    next_court_date = serializers.DateTimeField(required=False, allow_null=True)
    next_action = serializers.CharField(max_length=255, required=False, allow_blank=True)
    claim_amount = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, allow_null=True, min_value=0)
    currency = serializers.CharField(max_length=3, required=False, allow_blank=True, default="KES")
    plaintiff = serializers.CharField(max_length=255, required=False, allow_blank=True)
    defendant = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def _clean_text(self, value):
        return " ".join(str(value or "").strip().split())

    def _court_data(self, attrs):
        court = dict(attrs.get("court_proceeding") or {})
        flat_map = {
            "official_court_case_number": "official_court_case_number",
            "filing_date": "filing_date",
            "court_type": "court_type",
            "court_level": "court_level",
            "court_name": "court_name",
            "court_station": "court_station",
            "registry": "registry",
            "court_division": "division",
            "courtroom": "courtroom",
            "judicial_officer": "judicial_officer",
            "court_location": "court_location",
            "efiling_reference": "efiling_reference",
            "assessment_reference": "assessment_reference",
            "court_fee_amount": "court_fee_amount",
            "payment_reference": "payment_reference",
            "payment_date": "payment_date",
            "jurisdiction_notes": "jurisdiction_notes",
            "next_court_date": "next_date",
            "next_action": "next_action",
        }
        for source, target in flat_map.items():
            if source in attrs and target not in court:
                court[target] = attrs.get(source)
        return court


    def _coerce_date(self, value, field_name, errors):
        if value in (None, '') or hasattr(value, 'isoformat'):
            return value
        parsed = parse_date(str(value))
        if parsed is None:
            errors[field_name] = 'Enter a valid date.'
            return value
        return parsed

    def _coerce_datetime(self, value, field_name, errors):
        if value in (None, '') or hasattr(value, 'isoformat'):
            return value
        parsed = parse_datetime(str(value))
        if parsed is None:
            errors[field_name] = 'Enter a valid date and time.'
            return value
        return parsed

    def validate_currency(self, value):
        value = (value or "KES").strip().upper()
        if len(value) != 3 or not value.isalpha():
            raise serializers.ValidationError("Currency must be a three-letter code.")
        return value

    def validate(self, attrs):
        supplied_controlled = [field for field in CONTROLLED_CREATE_FIELDS if field in self.initial_data]
        if supplied_controlled:
            raise serializers.ValidationError(
                {
                    field: "This field is controlled by the lifecycle, filing or jurisdiction verification workflow."
                    for field in supplied_controlled
                }
            )

        attrs["currency"] = (attrs.get("currency") or "KES").strip().upper()
        explicit_entry_route = "entry_route" in self.initial_data
        attrs["_entry_route_explicit"] = explicit_entry_route
        attrs["procedure_type"] = attrs.get("procedure_type") or attrs.get("procedure_track") or ""
        if not attrs["procedure_type"] and self._court_data(attrs).get("official_court_case_number"):
            attrs["procedure_type"] = Case.ProcedureTrack.CIVIL_SUIT
        attrs["procedure_track"] = attrs["procedure_type"]

        route = attrs["entry_route"]
        forum = attrs["forum"]
        court = self._court_data(attrs)
        errors = {}

        if court.get("filing_date") not in (None, ""):
            court["filing_date"] = self._coerce_date(court.get("filing_date"), "filing_date", errors)
        assessment_date = attrs.get("assessment_date")
        if assessment_date not in (None, ""):
            assessment_date = self._coerce_date(assessment_date, "assessment_date", errors)
            attrs["assessment_date"] = assessment_date
        if court.get("payment_date") not in (None, ""):
            court["payment_date"] = self._coerce_date(court.get("payment_date"), "payment_date", errors)
        if court.get("next_date") not in (None, ""):
            court["next_date"] = self._coerce_datetime(court.get("next_date"), "next_court_date", errors)

        filed_case_intent = (
            route == Case.EntryRoute.EXISTING_FILED_COURT_CASE
            or (
                not explicit_entry_route
                and any(key in self.initial_data for key in [
                    "official_court_case_number",
                    "filing_date",
                    "efiling_reference",
                    "payment_reference",
                    "court_proceeding",
                ])
            )
        )

        if filed_case_intent:
            official_number = self._clean_text(court.get("official_court_case_number"))
            if not official_number:
                errors["official_court_case_number"] = "Official court case number is required for filed-case registration."
            else:
                firm = self.context.get("firm")
                if firm and Case.objects.filter(
                    firm=firm,
                    official_court_case_number__iexact=official_number,
                ).exists():
                    errors["court_proceeding.official_court_case_number"] = "A matter with this case number already exists."
                court["official_court_case_number"] = official_number

            if not court.get("filing_date"):
                errors["filing_date"] = "Filing date is required for an existing filed court case."
            filing_channel = self._clean_text(attrs.get("filing_channel", "")).upper()
            if filing_channel in {"ELECTRONIC", "EFILING", "E-FILING"} and not court.get("efiling_reference"):
                errors["efiling_reference"] = "eFiling reference is required when filing was electronic."
            if court.get("payment_reference") and not court.get("payment_date"):
                errors["payment_date"] = "Payment date is required when a payment reference is recorded."
            if attrs.get("payment_completed") and court.get("court_fee_amount") in (None, ""):
                errors["court_fee_amount"] = "Court fee amount is required when payment is marked completed."
            if assessment_date and court.get("payment_date") and court.get("payment_date") < assessment_date:
                errors["payment_date"] = "Payment date cannot precede the assessment date."
            if not court.get("court_type"):
                errors["court_proceeding.court_type"] = "Court type is required for a court proceeding."
            if not (court.get("court_station") or court.get("court_name")):
                errors["court_proceeding.court_station"] = "Court station or court identification is required."
            if not court.get("registry"):
                errors["registry"] = "Registry is required for an existing filed court case."
            if not attrs.get("procedure_type"):
                errors["procedure_type"] = "Procedure type is required for an existing filed court case."

        if forum == Case.Forum.TRIBUNAL:
            tribunal = attrs.get("tribunal_proceeding") or {}
            if tribunal.get("filing_date") not in (None, ""):
                tribunal["filing_date"] = self._coerce_date(tribunal.get("filing_date"), "tribunal_proceeding.filing_date", errors)
            if tribunal.get("next_date") not in (None, ""):
                tribunal["next_date"] = self._coerce_datetime(tribunal.get("next_date"), "tribunal_proceeding.next_date", errors)
            if route == Case.EntryRoute.EXISTING_TRIBUNAL_MATTER and not tribunal.get("tribunal_name"):
                errors["tribunal_proceeding.tribunal_name"] = "Tribunal name is required."

        if forum == Case.Forum.ARBITRATION:
            arbitration = attrs.get("arbitration_proceeding") or {}
            if arbitration.get("commencement_date") not in (None, ""):
                arbitration["commencement_date"] = self._coerce_date(arbitration.get("commencement_date"), "arbitration_proceeding.commencement_date", errors)
            if arbitration.get("next_date") not in (None, ""):
                arbitration["next_date"] = self._coerce_datetime(arbitration.get("next_date"), "arbitration_proceeding.next_date", errors)
            if route == Case.EntryRoute.EXISTING_ARBITRATION and not (
                arbitration.get("institution") or arbitration.get("arbitration_institution")
            ):
                errors["arbitration_proceeding.institution"] = "Arbitration institution or administering body is required."

        non_contentious = attrs.get("non_contentious_details") or {}
        if non_contentious.get("target_completion_date") not in (None, ""):
            non_contentious["target_completion_date"] = self._coerce_date(non_contentious.get("target_completion_date"), "non_contentious_details.target_completion_date", errors)

        monetary = attrs.get("monetary_relief") or {}
        relief_type = monetary.get("relief_type") or monetary.get("monetary_relief_type")
        if relief_type == "QUANTIFIED":
            principal = monetary.get("principal_amount", attrs.get("claim_amount"))
            if principal in ("", None):
                errors["monetary_relief.principal_amount"] = "Principal amount is required for quantified relief."

        if errors:
            raise serializers.ValidationError(errors)

        attrs["court_proceeding"] = court
        return attrs
