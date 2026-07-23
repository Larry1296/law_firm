from rest_framework import serializers

from apps.clients.models import ClientMatterConflictCheck, ConflictCheckHistory, ConflictCheckParty
from apps.common.choices import ConflictCheckSourceCategory, ConflictCheckStatus


class ConflictCheckPartySerializer(serializers.ModelSerializer):
    class Meta:
        model = ConflictCheckParty
        fields = [
            "id",
            "name",
            "party_type",
            "role",
            "aliases",
            "identification_reference",
            "relationship_to_party",
            "contact_information",
            "internal_notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ConflictCheckHistorySerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.full_name", read_only=True)
    from_status_label = serializers.SerializerMethodField()
    to_status_label = serializers.CharField(source="get_to_status_display", read_only=True)

    def get_from_status_label(self, obj):
        return dict(ConflictCheckStatus.choices).get(obj.from_status, obj.from_status)

    class Meta:
        model = ConflictCheckHistory
        fields = [
            "id",
            "from_status",
            "from_status_label",
            "to_status",
            "to_status_label",
            "action",
            "summary",
            "metadata",
            "actor_name",
            "created_at",
        ]
        read_only_fields = fields


class ClientMatterConflictCheckListSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    responsible_lawyer_name = serializers.CharField(source="responsible_lawyer.user.full_name", read_only=True)
    review_assigned_to_name = serializers.CharField(source="review_assigned_to.user.full_name", read_only=True)
    decided_by_name = serializers.CharField(source="decided_by.user.full_name", read_only=True)
    created_case_number = serializers.CharField(source="created_case.case_number", read_only=True)
    adverse_parties = serializers.SerializerMethodField()
    is_consumed = serializers.BooleanField(read_only=True)
    permitted_next_statuses = serializers.SerializerMethodField()

    def get_adverse_parties(self, obj):
        return [
            party.name
            for party in obj.parties.all()
            if party.role == ConflictCheckParty.PartyRole.PROPOSED_ADVERSE_PARTY
        ]

    def get_permitted_next_statuses(self, obj):
        from apps.clients.services.conflict import ClientMatterConflictService

        return [
            {"value": value, "label": dict(ConflictCheckStatus.choices).get(value, value)}
            for value in sorted(ClientMatterConflictService.ALLOWED_TRANSITIONS.get(obj.status, set()))
        ]

    class Meta:
        model = ClientMatterConflictCheck
        fields = [
            "id",
            "reference_number",
            "proposed_matter_title",
            "urgency_level",
            "limitation_or_deadline_date",
            "status",
            "status_label",
            "responsible_lawyer",
            "responsible_lawyer_name",
            "review_assigned_to",
            "review_assigned_to_name",
            "decided_by_name",
            "created_case",
            "created_case_number",
            "consumed_at",
            "is_consumed",
            "adverse_parties",
            "permitted_next_statuses",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ClientMatterConflictCheckDetailSerializer(ClientMatterConflictCheckListSerializer):
    parties = ConflictCheckPartySerializer(many=True, read_only=True)
    history = ConflictCheckHistorySerializer(many=True, read_only=True)
    client_name = serializers.CharField(source="client.full_name", read_only=True)

    class Meta(ClientMatterConflictCheckListSerializer.Meta):
        fields = ClientMatterConflictCheckListSerializer.Meta.fields + [
            "client",
            "client_name",
            "proposed_instructions",
            "factual_summary",
            "desired_outcome",
            "urgency_details",
            "started_at",
            "completed_at",
            "names_checked",
            "source_categories_checked",
            "other_source_description",
            "information_missing",
            "first_reviewer_findings",
            "result_summary",
            "internal_reason",
            "restricted_note",
            "decision_confirmation",
            "decided_by",
            "decided_at",
            "no_adverse_party_currently_known",
            "no_adverse_party_explanation",
            "parties",
            "history",
        ]
        read_only_fields = fields


class ProposedMatterSerializer(serializers.Serializer):
    proposed_matter_title = serializers.CharField(max_length=255)
    proposed_instructions = serializers.CharField()
    factual_summary = serializers.CharField(required=False, allow_blank=True)
    desired_outcome = serializers.CharField(required=False, allow_blank=True)
    urgency_level = serializers.CharField(required=False, allow_blank=True, max_length=30)
    urgency_details = serializers.CharField(required=False, allow_blank=True)
    limitation_or_deadline_date = serializers.DateField(required=False, allow_null=True)
    responsible_lawyer_id = serializers.UUIDField(required=False, allow_null=True)
    no_adverse_party_currently_known = serializers.BooleanField(required=False, default=False)
    no_adverse_party_explanation = serializers.CharField(required=False, allow_blank=True)
    parties = ConflictCheckPartySerializer(many=True, required=False)


class StartCheckSerializer(serializers.Serializer):
    summary = serializers.CharField(required=False, allow_blank=True)


class RequestInformationSerializer(serializers.Serializer):
    information_missing = serializers.CharField()


class ResumeCheckSerializer(serializers.Serializer):
    information_missing = serializers.CharField(required=False, allow_blank=True)
    summary = serializers.CharField(required=False, allow_blank=True)


class PotentialConflictSerializer(serializers.Serializer):
    first_reviewer_findings = serializers.CharField()


class EscalationSerializer(serializers.Serializer):
    review_assigned_to_id = serializers.UUIDField()
    summary = serializers.CharField()


class FinalDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(
        choices=[
            ConflictCheckStatus.CLEARED,
            ConflictCheckStatus.CONFLICT_CONFIRMED,
        ]
    )
    names_checked = serializers.ListField(child=serializers.CharField(), required=False)
    source_categories_checked = serializers.ListField(
        child=serializers.ChoiceField(choices=ConflictCheckSourceCategory.choices),
        required=False,
    )
    other_source_description = serializers.CharField(required=False, allow_blank=True)
    result_summary = serializers.CharField(required=False, allow_blank=True)
    internal_reason = serializers.CharField(required=False, allow_blank=True)
    restricted_note = serializers.CharField(required=False, allow_blank=True)
    decision_confirmation = serializers.BooleanField()


class CloseWithoutDecisionSerializer(serializers.Serializer):
    closure_reason = serializers.CharField()


class ClearedUnconsumedConflictCheckSerializer(ClientMatterConflictCheckListSerializer):
    class Meta(ClientMatterConflictCheckListSerializer.Meta):
        fields = ClientMatterConflictCheckListSerializer.Meta.fields + [
            "proposed_instructions",
            "factual_summary",
            "desired_outcome",
            "result_summary",
        ]
        read_only_fields = fields
