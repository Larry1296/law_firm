"""Serializers for the ProposedMatter model."""

from rest_framework import serializers

from apps.cases.models import ProposedMatter


class ProposedMatterCreateSerializer(serializers.Serializer):
    """Validates incoming data when creating a proposed matter."""

    client_id = serializers.UUIDField(required=False, allow_null=True)
    responsible_advocate_id = serializers.UUIDField(required=False, allow_null=True)

    title = serializers.CharField(max_length=255)
    proposed_instructions = serializers.CharField(
        help_text="The proposed instructions from the prospective client.",
    )
    factual_summary = serializers.CharField(required=False, allow_blank=True, default="")
    desired_outcome = serializers.CharField(required=False, allow_blank=True, default="")

    urgency_level = serializers.ChoiceField(
        choices=ProposedMatter.UrgencyLevel.choices,
        required=False,
        default=ProposedMatter.UrgencyLevel.NORMAL,
    )
    urgency_details = serializers.CharField(required=False, allow_blank=True, default="")

    known_adverse_party = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        default="",
    )
    no_adverse_party_known = serializers.BooleanField(required=False, default=False)

    limitation_date = serializers.DateField(required=False, allow_null=True)

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Proposed matter title must not be blank.")
        return value

    def validate_proposed_instructions(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Proposed instructions are required.")
        return value


class ProposedMatterUpdateSerializer(serializers.Serializer):
    """Validates partial updates to a proposed matter (only DRAFT status)."""

    title = serializers.CharField(max_length=255, required=False)
    proposed_instructions = serializers.CharField(required=False)
    factual_summary = serializers.CharField(required=False, allow_blank=True)
    desired_outcome = serializers.CharField(required=False, allow_blank=True)
    urgency_level = serializers.ChoiceField(
        choices=ProposedMatter.UrgencyLevel.choices,
        required=False,
    )
    urgency_details = serializers.CharField(required=False, allow_blank=True)
    known_adverse_party = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
    )
    no_adverse_party_known = serializers.BooleanField(required=False)
    limitation_date = serializers.DateField(required=False, allow_null=True)
    responsible_advocate_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_title(self, value):
        if value is not None:
            value = value.strip()
            if not value:
                raise serializers.ValidationError("Proposed matter title must not be blank.")
        return value

    def validate_proposed_instructions(self, value):
        if value is not None:
            value = value.strip()
            if not value:
                raise serializers.ValidationError("Proposed instructions are required.")
        return value


class ProposedMatterDetailSerializer(serializers.Serializer):
    """Read serializer – exposes all relevant fields."""

    id = serializers.UUIDField(read_only=True)
    firm = serializers.SerializerMethodField()
    client = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()
    responsible_advocate = serializers.SerializerMethodField()

    title = serializers.CharField(read_only=True)
    proposed_instructions = serializers.CharField(read_only=True)
    factual_summary = serializers.CharField(read_only=True)
    desired_outcome = serializers.CharField(read_only=True)

    urgency_level = serializers.CharField(read_only=True)
    urgency_details = serializers.CharField(read_only=True)

    known_adverse_party = serializers.CharField(read_only=True)
    no_adverse_party_known = serializers.BooleanField(read_only=True)

    limitation_date = serializers.DateField(read_only=True)

    status = serializers.CharField(read_only=True)
    submitted_at = serializers.DateTimeField(read_only=True)
    withdrawn_at = serializers.DateTimeField(read_only=True)
    withdrawal_reason = serializers.CharField(read_only=True)
    converted_to_case = serializers.SerializerMethodField()

    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def get_firm(self, obj):
        if obj.firm_id:
            return {"id": str(obj.firm_id), "name": obj.firm.name}
        return None

    def get_client(self, obj):
        if obj.client_id:
            return {
                "id": str(obj.client_id),
                "name": getattr(obj.client, "full_name", str(obj.client)),
            }
        return None

    def get_created_by(self, obj):
        if obj.created_by_id:
            return {
                "id": str(obj.created_by_id),
                "name": obj.created_by.full_name,
            }
        return None

    def get_responsible_advocate(self, obj):
        if obj.responsible_advocate_id:
            user = obj.responsible_advocate.user
            return {
                "id": str(obj.responsible_advocate_id),
                "name": user.full_name if user else str(obj.responsible_advocate),
            }
        return None

    def get_converted_to_case(self, obj):
        if obj.converted_to_case_id:
            return {
                "id": str(obj.converted_to_case_id),
                "title": obj.converted_to_case.title,
                "case_number": obj.converted_to_case.case_number,
            }
        return None


class ProposedMatterWithdrawSerializer(serializers.Serializer):
    """Validates a withdrawal request."""

    reason = serializers.CharField(required=False, allow_blank=True, default="")


class ProposedMatterConvertSerializer(serializers.Serializer):
    """Validates a conversion request."""

    client_id = serializers.UUIDField()
    conflict_check_id = serializers.UUIDField()
