from rest_framework import serializers

from apps.cases.models import Case


class CaseCreateSerializer(serializers.Serializer):
    client_id = serializers.UUIDField()
    assigned_lawyer_membership_id = serializers.UUIDField(required=False, allow_null=True)
    assigned_secretary_membership_id = serializers.UUIDField(required=False, allow_null=True)
    case_number = serializers.CharField(max_length=60, required=False, allow_blank=True)
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    case_type = serializers.ChoiceField(choices=Case.CaseType.choices)
    procedure_track = serializers.ChoiceField(choices=Case.ProcedureTrack.choices, required=False, allow_blank=True)
    court_type = serializers.ChoiceField(choices=Case.CourtType.choices)
    court_division = serializers.ChoiceField(choices=Case.CourtDivision.choices, required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=Case.Status.choices, required=False)
    priority = serializers.ChoiceField(choices=Case.Priority.choices, required=False)
    filing_date = serializers.DateField(required=False, allow_null=True)
    court_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    court_station = serializers.CharField(max_length=255, required=False, allow_blank=True)
    registry = serializers.CharField(max_length=255, required=False, allow_blank=True)
    courtroom = serializers.CharField(max_length=100, required=False, allow_blank=True)
    judicial_officer = serializers.CharField(max_length=255, required=False, allow_blank=True)
    court_location = serializers.CharField(max_length=255, required=False, allow_blank=True)
    efiling_reference = serializers.CharField(max_length=120, required=False, allow_blank=True)
    cts_reference = serializers.CharField(max_length=120, required=False, allow_blank=True)
    payment_reference = serializers.CharField(max_length=120, required=False, allow_blank=True)
    next_court_date = serializers.DateTimeField(required=False, allow_null=True)
    next_action = serializers.CharField(max_length=255, required=False, allow_blank=True)
    plaintiff = serializers.CharField(max_length=255, required=False, allow_blank=True)
    defendant = serializers.CharField(max_length=255, required=False, allow_blank=True)
    client_party_role = serializers.CharField(max_length=40, required=False, allow_blank=True)
