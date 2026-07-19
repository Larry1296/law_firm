from rest_framework import serializers

from apps.cases.models import Case
from apps.cases.serializers.case_activity_serializer import CaseActivitySerializer
from apps.cases.serializers.case_attachment_serializer import CaseAttachmentSerializer
from apps.cases.serializers.case_filing_serializer import CaseFilingSerializer
from apps.cases.serializers.case_note_serializer import CaseNoteSerializer
from apps.cases.serializers.case_party_serializer import CasePartySerializer
from apps.cases.serializers.case_task_serializer import CaseTaskSerializer
from apps.cases.serializers.case_timeline_serializer import CaseTimelineSerializer
from apps.cases.serializers.case_conflict_check_serializer import (
    CaseConflictCheckSerializer,
)
from apps.cases.serializers.case_lifecycle_transition_serializer import (
    CaseLifecycleTransitionSerializer,
)
from apps.cases.serializers.matter_detail_serializers import (
    ArbitrationProceedingSerializer,
    ConflictRecordAtRegistrationSerializer,
    CourtProceedingSerializer,
    CriminalMatterDetailsSerializer,
    EmploymentMatterDetailsSerializer,
    InsuranceMatterDetailsSerializer,
    LandMatterDetailsSerializer,
    MonetaryReliefSerializer,
    NonContentiousMatterDetailsSerializer,
    SuccessionMatterDetailsSerializer,
    TribunalProceedingSerializer,
)
from apps.cases.services.case_conflict_check_service import CaseConflictCheckService
from apps.cases.services.case_lifecycle_service import CaseLifecycleService
from apps.events.serializers import EventSerializer


class CaseDetailSerializer(serializers.ModelSerializer):
    firm = serializers.SerializerMethodField()
    client = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()
    plaintiff_name = serializers.SerializerMethodField()
    case_owner = serializers.SerializerMethodField()
    assigned_lawyer = serializers.SerializerMethodField()
    assigned_secretary = serializers.SerializerMethodField()
    timeline = CaseTimelineSerializer(many=True, read_only=True)
    events = serializers.SerializerMethodField()
    filings = serializers.SerializerMethodField()
    documents = serializers.SerializerMethodField()
    notes = serializers.SerializerMethodField()
    tasks = serializers.SerializerMethodField()
    parties = serializers.SerializerMethodField()
    activities = CaseActivitySerializer(many=True, read_only=True)
    lifecycle_transitions = CaseLifecycleTransitionSerializer(many=True, read_only=True)
    matter_status_label = serializers.CharField(source="get_matter_status_display", read_only=True)
    entry_route_label = serializers.CharField(source="get_entry_route_display", read_only=True)
    practice_area_label = serializers.CharField(source="get_practice_area_display", read_only=True)
    matter_nature_label = serializers.CharField(source="get_matter_nature_display", read_only=True)
    forum_label = serializers.CharField(source="get_forum_display", read_only=True)
    procedure_type_label = serializers.CharField(source="get_procedure_type_display", read_only=True)
    court_stage_label = serializers.CharField(source="get_court_stage_display", read_only=True)
    outcome_status_label = serializers.CharField(source="get_outcome_status_display", read_only=True)
    enforcement_status_label = serializers.CharField(source="get_enforcement_status_display", read_only=True)
    appeal_status_label = serializers.CharField(source="get_appeal_status_display", read_only=True)
    internal_case_number = serializers.CharField(source="case_number", read_only=True)
    available_transitions = serializers.SerializerMethodField()
    jurisdiction_warnings = serializers.SerializerMethodField()
    conflict_check = serializers.SerializerMethodField()
    analytics = serializers.SerializerMethodField()
    court_proceeding = serializers.SerializerMethodField()
    tribunal_proceeding = serializers.SerializerMethodField()
    arbitration_proceeding = serializers.SerializerMethodField()
    non_contentious_details = serializers.SerializerMethodField()
    land_details = serializers.SerializerMethodField()
    succession_details = serializers.SerializerMethodField()
    insurance_details = serializers.SerializerMethodField()
    employment_details = serializers.SerializerMethodField()
    criminal_details = serializers.SerializerMethodField()
    monetary_relief = serializers.SerializerMethodField()
    conflict_record = serializers.SerializerMethodField()

    def _client_visible_only(self):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        return bool(user and hasattr(user, "client_profile"))

    def get_client(self, obj):
        client = obj.client
        return {
            "id": str(client.id),
            "full_name": client.full_name,
            "email": client.email,
            "phone_number": client.phone_number,
            "national_id": client.national_id,
            "client_type": client.client_type,
            "access_type": client.access_type,
            "lifecycle_status": client.lifecycle_status,
        }

    def get_created_by(self, obj):
        if not obj.created_by:
            return None
        return {
            "id": str(obj.created_by.id),
            "full_name": obj.created_by.full_name,
            "email": obj.created_by.email,
        }

    def get_firm(self, obj):
        firm = obj.firm
        return {
            "id": str(firm.id),
            "name": firm.name,
            "email": firm.email,
            "phone_number": firm.phone_number,
            "website": firm.website,
            "physical_address": firm.physical_address,
            "postal_address": firm.postal_address,
        }

    def get_plaintiff_name(self, obj):
        return obj.plaintiff or obj.client.full_name

    def get_case_owner(self, obj):
        client = obj.client
        party = obj.parties.filter(client=client, is_our_client=True).first()
        return {
            "id": str(client.id),
            "full_name": party.name if party else obj.plaintiff or client.full_name,
            "email": client.email,
            "phone_number": client.phone_number,
            "national_id": client.national_id,
            "party_role": party.party_role if party else "PLAINTIFF",
            "party_role_label": party.get_party_role_display() if party else "Plaintiff",
            "client_id": str(client.id),
        }

    def get_assigned_lawyer(self, obj):
        if not obj.assigned_lawyer:
            return None
        return {
            "id": str(obj.assigned_lawyer.id),
            "membership_id": str(obj.assigned_lawyer.id),
            "full_name": obj.assigned_lawyer.user.full_name,
            "email": obj.assigned_lawyer.user.email,
        }

    def get_assigned_secretary(self, obj):
        if not obj.assigned_secretary:
            return None
        return {
            "id": str(obj.assigned_secretary.id),
            "membership_id": str(obj.assigned_secretary.id),
            "full_name": obj.assigned_secretary.user.full_name,
            "email": obj.assigned_secretary.user.email,
        }

    def get_events(self, obj):
        queryset = obj.events.all()
        if self._client_visible_only():
            queryset = queryset.filter(is_client_visible=True)
        return EventSerializer(queryset, many=True).data

    def get_filings(self, obj):
        queryset = obj.filings.all()
        if self._client_visible_only():
            queryset = queryset.filter(is_client_visible=True)
        return CaseFilingSerializer(queryset, many=True).data

    def get_documents(self, obj):
        queryset = obj.attachments.all()
        if self._client_visible_only():
            queryset = queryset.filter(is_client_visible=True)
        return CaseAttachmentSerializer(queryset, many=True).data

    def get_notes(self, obj):
        queryset = obj.notes.all()
        if self._client_visible_only():
            queryset = queryset.filter(is_client_visible=True)
        return CaseNoteSerializer(queryset, many=True).data

    def get_tasks(self, obj):
        queryset = obj.tasks.all()
        if self._client_visible_only():
            queryset = queryset.filter(is_client_visible=True)
        return CaseTaskSerializer(queryset, many=True).data

    def get_parties(self, obj):
        queryset = obj.parties.all()
        if self._client_visible_only():
            queryset = queryset.exclude(party_role="ADVOCATE_ON_RECORD")
        return CasePartySerializer(queryset, many=True).data

    def get_analytics(self, obj):
        return {
            "timeline_count": obj.timeline.count(),
            "events_count": obj.events.count(),
            "filings_count": obj.filings.count(),
            "documents_count": obj.attachments.count(),
            "tasks_count": obj.tasks.count(),
            "parties_count": obj.parties.count(),
            "activity_score": (
                obj.activities.count()
                + obj.timeline.count()
                + obj.events.count()
                + obj.filings.count()
            ),
            "age_days": (obj.updated_at.date() - obj.created_at.date()).days,
            "has_events": obj.events.exists(),
            "has_documents": obj.attachments.exists(),
        }

    class Meta:
        model = Case
        fields = [
            "id",
            "case_number",
            "internal_case_number",
            "official_court_case_number",
            "title",
            "description",
            "firm",
            "created_by",
            "entry_route",
            "entry_route_label",
            "practice_area",
            "practice_area_label",
            "matter_nature",
            "matter_nature_label",
            "forum",
            "forum_label",
            "case_type",
            "procedure_track",
            "procedure_type",
            "procedure_type_label",
            "status",
            "matter_status",
            "matter_status_label",
            "court_stage",
            "court_stage_label",
            "outcome_status",
            "outcome_status_label",
            "enforcement_status",
            "enforcement_status_label",
            "appeal_status",
            "appeal_status_label",
            "priority",
            "date_instructions_received",
            "urgency_level",
            "urgency_reason",
            "limitation_date",
            "internal_deadline",
            "conflict_status",
            "court_type",
            "court_division",
            "court_name",
            "court_station",
            "registry",
            "courtroom",
            "judicial_officer",
            "court_location",
            "efiling_reference",
            "cts_reference",
            "payment_reference",
            "assessment_reference",
            "court_fee_amount",
            "payment_date",
            "filing_date",
            "filed_by",
            "claim_amount",
            "currency",
            "court_level",
            "judicial_officer_rank",
            "jurisdiction_notes",
            "jurisdiction_verified",
            "jurisdiction_verified_by",
            "jurisdiction_verified_at",
            "next_court_date",
            "next_action",
            "plaintiff",
            "plaintiff_name",
            "defendant",
            "client",
            "case_owner",
            "assigned_lawyer",
            "assigned_secretary",
            "is_active",
            "closed_at",
            "created_at",
            "updated_at",
            "timeline",
            "events",
            "filings",
            "documents",
            "notes",
            "tasks",
            "parties",
            "activities",
            "lifecycle_transitions",
            "available_transitions",
            "jurisdiction_warnings",
            "conflict_check",
            "conflict_record",
            "court_proceeding",
            "tribunal_proceeding",
            "arbitration_proceeding",
            "non_contentious_details",
            "land_details",
            "succession_details",
            "insurance_details",
            "employment_details",
            "criminal_details",
            "monetary_relief",
            "analytics",
        ]
        read_only_fields = fields

    def get_available_transitions(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        return CaseLifecycleService.get_available_transitions(obj, user)

    def get_jurisdiction_warnings(self, obj):
        warnings = []
        if obj.forum != obj.Forum.COURT:
            return warnings
        if obj.claim_amount is None and not hasattr(obj, "monetary_relief"):
            warnings.append("Claim amount has not been captured.")
        if not obj.court_station and not obj.court_name:
            warnings.append("Court station or court identification is missing.")
        if not obj.jurisdiction_verified:
            warnings.append("Jurisdiction has not been verified.")
        if not obj.court_level:
            warnings.append("Court level has not been confirmed.")
        if obj.court_stage in {obj.CourtStage.READY_FOR_FILING, obj.CourtStage.FILED} and not obj.court_fee_amount:
            warnings.append("Court fee assessment is pending.")
        if obj.court_stage in {obj.CourtStage.READY_FOR_FILING, obj.CourtStage.FILED} and not obj.official_court_case_number:
            warnings.append("Official court case number has not been assigned.")
        return warnings

    def get_conflict_check(self, obj):
        check = CaseConflictCheckService.existing_check(obj)
        if self._client_visible_only():
            return {"status": CaseConflictCheckService.client_safe_status(check)}
        return CaseConflictCheckSerializer(check, context=self.context).data if check else None

    def _related(self, obj, attr, serializer_class):
        try:
            value = getattr(obj, attr)
        except Exception:
            return None
        return serializer_class(value, context=self.context).data if value else None

    def get_court_proceeding(self, obj):
        return self._related(obj, "court_proceeding", CourtProceedingSerializer)

    def get_tribunal_proceeding(self, obj):
        return self._related(obj, "tribunal_proceeding", TribunalProceedingSerializer)

    def get_arbitration_proceeding(self, obj):
        return self._related(obj, "arbitration_proceeding", ArbitrationProceedingSerializer)

    def get_non_contentious_details(self, obj):
        return self._related(obj, "non_contentious_details", NonContentiousMatterDetailsSerializer)

    def get_land_details(self, obj):
        return self._related(obj, "land_details", LandMatterDetailsSerializer)

    def get_succession_details(self, obj):
        return self._related(obj, "succession_details", SuccessionMatterDetailsSerializer)

    def get_insurance_details(self, obj):
        return self._related(obj, "insurance_details", InsuranceMatterDetailsSerializer)

    def get_employment_details(self, obj):
        return self._related(obj, "employment_details", EmploymentMatterDetailsSerializer)

    def get_criminal_details(self, obj):
        return self._related(obj, "criminal_details", CriminalMatterDetailsSerializer)

    def get_monetary_relief(self, obj):
        return self._related(obj, "monetary_relief", MonetaryReliefSerializer)

    def get_conflict_record(self, obj):
        if self._client_visible_only():
            return None
        return self._related(obj, "conflict_record", ConflictRecordAtRegistrationSerializer)
