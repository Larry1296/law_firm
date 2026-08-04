from rest_framework import serializers
from django.utils import timezone

from apps.clients.models import (
    ClientMatterConflictCheck,
    ConflictCheckHistory,
    ConflictCheckParty,
    FirmAcceptanceHistory,
    ProposedMatterJurisdiction,
    ProposedMatterJurisdictionHistory,
)
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


class FirmAcceptanceHistorySerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.full_name", read_only=True)
    decided_by_name = serializers.CharField(source="decided_by.user.full_name", read_only=True)

    class Meta:
        model = FirmAcceptanceHistory
        fields = [
            "id",
            "from_decision",
            "to_decision",
            "reason_category",
            "internal_reason",
            "scope_confirmation",
            "engagement_status",
            "actor_name",
            "decided_by_name",
            "metadata",
            "created_at",
        ]
        read_only_fields = fields


class ProposedMatterJurisdictionHistorySerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.full_name", read_only=True)

    class Meta:
        model = ProposedMatterJurisdictionHistory
        fields = ["id", "action", "from_status", "to_status", "snapshot", "reason", "actor_name", "created_at"]
        read_only_fields = fields


class ProposedMatterJurisdictionSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    confirmed_by_name = serializers.CharField(source="confirmed_by.user.full_name", read_only=True)
    disclaimer = serializers.CharField(read_only=True)
    is_final = serializers.BooleanField(read_only=True)
    history = ProposedMatterJurisdictionHistorySerializer(many=True, read_only=True)

    class Meta:
        model = ProposedMatterJurisdiction
        fields = [
            "id", "status", "status_label", "input_facts", "suggestion", "alternatives",
            "warnings", "missing_information", "authorities", "rule_version", "completeness",
            "generated_at", "advocate_action", "final_forum", "final_court_type",
            "final_court_level", "final_station", "subject_matter_basis", "pecuniary_basis",
            "territorial_basis", "legal_basis", "advocate_findings", "override_reason",
            "confirmed_by_name", "confirmed_at", "disclaimer", "is_final", "history",
        ]
        read_only_fields = fields


class ClientMatterConflictCheckListSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    responsible_lawyer_name = serializers.CharField(source="responsible_lawyer.user.full_name", read_only=True)
    review_assigned_to_name = serializers.CharField(source="review_assigned_to.user.full_name", read_only=True)
    decided_by_name = serializers.CharField(source="decided_by.user.full_name", read_only=True)
    created_case_number = serializers.CharField(source="created_case.case_number", read_only=True)
    created_internal_matter_number = serializers.CharField(source="created_case.case_number", read_only=True)
    accepted_by_name = serializers.CharField(source="accepted_by.user.full_name", read_only=True)
    acceptance_decided_by_name = serializers.CharField(source="acceptance_decided_by.user.full_name", read_only=True)
    adverse_parties = serializers.SerializerMethodField()
    is_consumed = serializers.BooleanField(read_only=True)
    can_open_matter = serializers.SerializerMethodField()
    permitted_next_statuses = serializers.SerializerMethodField()
    date_instructions_received = serializers.SerializerMethodField()
    opening_readiness = serializers.SerializerMethodField()

    def get_date_instructions_received(self, obj):
        return timezone.localtime(obj.created_at).date().isoformat()

    def get_can_open_matter(self, obj):
        return self.get_opening_readiness(obj)["ready"]

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

    def get_opening_readiness(self, obj):
        from apps.clients.services.engagement_service import EngagementService
        from apps.clients.services.compliance_review_service import ClientComplianceReviewService

        engagement = EngagementService.current_for(obj)
        compliance_errors = ClientComplianceReviewService.opening_errors(obj.client)
        proposed_forum = (obj.jurisdiction_facts or {}).get("forum", "")
        jurisdiction_required = proposed_forum not in {"", "NO_FORMAL_FORUM"}
        checks = [
            {
                "code": "CONFLICT_CLEARED",
                "label": "Conflict check cleared and confirmed",
                "complete": bool(
                    obj.status == ConflictCheckStatus.CLEARED
                    and obj.decision_confirmation
                    and obj.decided_by_id
                    and obj.decided_at
                ),
            },
            {
                "code": "FIRM_ACCEPTED",
                "label": "Firm acceptance recorded by an advocate",
                "complete": bool(
                    obj.acceptance_decision == ClientMatterConflictCheck.AcceptanceDecision.ACCEPTED
                    and obj.accepted_by_id
                    and obj.accepted_at
                ),
            },
            {
                "code": "ENGAGEMENT_READY",
                "label": "Formal engagement approved or policy exception authorised",
                "complete": bool(engagement and engagement.permits_opening),
            },
            {
                "code": "CLIENT_IDENTITY_VERIFIED",
                "label": "Client identity verification complete",
                "complete": "identity_verification" not in compliance_errors and "client_compliance" not in compliance_errors,
            },
            {
                "code": "AUTHORITY_VERIFIED",
                "label": "Authority to instruct verified",
                "complete": "authority_to_instruct" not in compliance_errors and "client_compliance" not in compliance_errors,
            },
            {
                "code": "DUE_DILIGENCE_CLEARED",
                "label": "Due diligence and beneficial ownership controls cleared",
                "complete": not any(key in compliance_errors for key in ["client_compliance", "beneficial_ownership", "due_diligence", "due_diligence_restriction", "source_of_funds"]),
            },
            {
                "code": "JURISDICTION_REVIEW",
                "label": "Applicable jurisdiction review confirmed",
                "complete": bool(not jurisdiction_required or (getattr(obj, "jurisdiction", None) and obj.jurisdiction.is_final)),
            },
            {
                "code": "NOT_CONSUMED",
                "label": "Proposed matter has not already been opened",
                "complete": not obj.is_consumed,
            },
        ]
        return {"ready": all(item["complete"] for item in checks), "checks": checks}

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
            "created_internal_matter_number",
            "acceptance_decision",
            "acceptance_reason_category",
            "engagement_status",
            "accepted_by",
            "accepted_by_name",
            "accepted_at",
            "acceptance_decided_by_name",
            "acceptance_decided_at",
            "can_open_matter",
            "consumed_at",
            "is_consumed",
            "adverse_parties",
            "permitted_next_statuses",
            "date_instructions_received",
            "opening_readiness",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ClientMatterConflictCheckDetailSerializer(ClientMatterConflictCheckListSerializer):
    parties = ConflictCheckPartySerializer(many=True, read_only=True)
    history = ConflictCheckHistorySerializer(many=True, read_only=True)
    acceptance_history = FirmAcceptanceHistorySerializer(many=True, read_only=True)
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    jurisdiction = ProposedMatterJurisdictionSerializer(read_only=True)
    document_requirements = serializers.SerializerMethodField()

    def get_document_requirements(self, obj):
        return [{
            "id": str(item.id), "stage": item.template.stage, "name": item.template.name,
            "document_category": item.template.document_category,
            "document_subtype": item.template.document_subtype,
            "required": item.template.is_required,
            "selected_document_id": str(item.selected_document_id) if item.selected_document_id else None,
            "selected_reference": item.selected_document.reference if item.selected_document_id else None,
            "verification_status": item.selected_document.verification_status if item.selected_document_id else None,
            "present": bool(item.selected_document_id), "notes": item.notes,
        } for item in obj.document_requirements.select_related("template", "selected_document")]

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
            "acceptance_internal_reason",
            "scope_confirmation",
            "no_adverse_party_currently_known",
            "no_adverse_party_explanation",
            "jurisdiction_facts",
            "jurisdiction",
            "parties",
            "history",
            "acceptance_history",
            "document_requirements",
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
    jurisdiction_facts = serializers.JSONField(required=False)


class JurisdictionSuggestionInputSerializer(serializers.Serializer):
    practice_area = serializers.CharField(required=False, allow_blank=True)
    matter_nature = serializers.CharField(required=False, allow_blank=True)
    dispute_category = serializers.CharField(required=False, allow_blank=True)
    claim_value = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, allow_null=True)
    relief_sought = serializers.CharField(required=False, allow_blank=True)
    legal_relationship = serializers.CharField(required=False, allow_blank=True)
    cause_of_action_location = serializers.CharField(required=False, allow_blank=True)
    defendant_location = serializers.CharField(required=False, allow_blank=True)
    property_location = serializers.CharField(required=False, allow_blank=True)
    proposed_station = serializers.CharField(required=False, allow_blank=True)
    religious_status = serializers.CharField(required=False, allow_blank=True)
    proceeding_role = serializers.CharField(required=False, allow_blank=True)
    existing_decision = serializers.CharField(required=False, allow_blank=True)
    statutory_process = serializers.CharField(required=False, allow_blank=True)


class JurisdictionAdvocateDecisionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["ACCEPT", "MODIFY", "REJECT", "REQUEST_INFORMATION", "DEFER"])
    final_forum = serializers.CharField(required=False, allow_blank=True)
    final_court_type = serializers.CharField(required=False, allow_blank=True)
    final_court_level = serializers.CharField(required=False, allow_blank=True)
    final_station = serializers.CharField(required=False, allow_blank=True)
    subject_matter_basis = serializers.CharField(required=False, allow_blank=True)
    pecuniary_basis = serializers.CharField(required=False, allow_blank=True)
    territorial_basis = serializers.CharField(required=False, allow_blank=True)
    legal_basis = serializers.CharField(required=False, allow_blank=True)
    advocate_findings = serializers.CharField(required=False, allow_blank=True)
    override_reason = serializers.CharField(required=False, allow_blank=True)


class JurisdictionReopenSerializer(serializers.Serializer):
    reason = serializers.CharField()


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


class FirmAcceptanceDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=ClientMatterConflictCheck.AcceptanceDecision.choices)
    reason_category = serializers.ChoiceField(
        choices=ClientMatterConflictCheck.AcceptanceReasonCategory.choices,
        required=False,
        allow_blank=True,
    )
    internal_reason = serializers.CharField(required=False, allow_blank=True)
    scope_confirmation = serializers.CharField(required=False, allow_blank=True)
    engagement_status = serializers.ChoiceField(
        choices=ClientMatterConflictCheck.EngagementStatus.choices,
        required=False,
    )


class ClearedUnconsumedConflictCheckSerializer(ClientMatterConflictCheckListSerializer):
    class Meta(ClientMatterConflictCheckListSerializer.Meta):
        fields = ClientMatterConflictCheckListSerializer.Meta.fields + [
            "proposed_instructions",
            "factual_summary",
            "desired_outcome",
            "result_summary",
        ]
        read_only_fields = fields
