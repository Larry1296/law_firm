from rest_framework import serializers

from apps.cases.models import Case
from apps.cases.serializers.case_attachment_serializer import CaseAttachmentSerializer
from apps.cases.serializers.case_filing_serializer import CaseFilingSerializer
from apps.cases.serializers.case_note_serializer import CaseNoteSerializer
from apps.cases.serializers.case_party_serializer import CasePartySerializer
from apps.cases.serializers.case_task_serializer import CaseTaskSerializer
from apps.cases.serializers.matter_detail_serializers import (
    ArbitrationProceedingSerializer,
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
from apps.events.serializers import EventSerializer


class ClientCaseSerializer(serializers.ModelSerializer):
    firm = serializers.SerializerMethodField()
    client = serializers.SerializerMethodField()
    plaintiff_name = serializers.SerializerMethodField()
    case_owner = serializers.SerializerMethodField()
    timeline = serializers.SerializerMethodField()
    events = serializers.SerializerMethodField()
    filings = serializers.SerializerMethodField()
    documents = serializers.SerializerMethodField()
    notes = serializers.SerializerMethodField()
    tasks = serializers.SerializerMethodField()
    parties = serializers.SerializerMethodField()
    analytics = serializers.SerializerMethodField()
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
    conflict_check = serializers.SerializerMethodField()

    def get_firm(self, obj):
        firm = obj.firm
        return {
            "id": str(firm.id),
            "name": firm.name,
            "email": firm.email,
            "phone_number": firm.phone_number,
            "website": firm.website,
        }

    def get_client(self, obj):
        client = obj.client
        return {
            "id": str(client.id),
            "full_name": client.full_name,
            "email": client.email,
            "phone_number": client.phone_number,
            "client_type": client.client_type,
            "lifecycle_status": client.lifecycle_status,
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
            "party_role": party.party_role if party else "PLAINTIFF",
            "party_role_label": party.get_party_role_display() if party else "Plaintiff",
            "client_id": str(client.id),
        }

    def get_timeline(self, obj):
        return [
            {
                "id": str(item.id),
                "action": item.action,
                "description": item.description,
                "created_at": item.created_at,
            }
            for item in obj.timeline.all()
        ]

    def get_events(self, obj):
        return EventSerializer(obj.events.filter(is_client_visible=True), many=True).data

    def get_filings(self, obj):
        return CaseFilingSerializer(obj.filings.filter(is_client_visible=True), many=True).data

    def get_documents(self, obj):
        return CaseAttachmentSerializer(obj.attachments.filter(is_client_visible=True), many=True).data

    def get_notes(self, obj):
        return CaseNoteSerializer(obj.notes.filter(is_client_visible=True), many=True).data

    def get_tasks(self, obj):
        return CaseTaskSerializer(obj.tasks.filter(is_client_visible=True), many=True).data

    def get_parties(self, obj):
        return CasePartySerializer(
            obj.parties.exclude(party_role="ADVOCATE_ON_RECORD"),
            many=True,
        ).data

    def _related(self, obj, attr, serializer_class):
        try:
            value = getattr(obj, attr)
        except Exception:
            return None
        return serializer_class(value).data if value else None

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

    def get_conflict_check(self, obj):
        return {"status": obj.conflict_status}

    def get_activities(self, obj):
        return [
            {
                "id": str(item.id),
                "action": item.action,
                "description": item.description,
                "created_at": item.created_at,
            }
            for item in obj.activities.all()
        ]

    def get_analytics(self, obj):
        return {
            "timeline_count": obj.timeline.count(),
            "events_count": obj.events.filter(is_client_visible=True).count(),
            "filings_count": obj.filings.filter(is_client_visible=True).count(),
            "documents_count": obj.attachments.filter(is_client_visible=True).count(),
            "tasks_count": obj.tasks.filter(is_client_visible=True).count(),
            "parties_count": obj.parties.count(),
            "age_days": (obj.updated_at.date() - obj.created_at.date()).days,
            "has_events": obj.events.filter(is_client_visible=True).exists(),
            "has_documents": obj.attachments.filter(is_client_visible=True).exists(),
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
            "claim_amount",
            "currency",
            "court_level",
            "jurisdiction_notes",
            "jurisdiction_verified",
            "jurisdiction_verified_at",
            "next_court_date",
            "next_action",
            "plaintiff",
            "plaintiff_name",
            "defendant",
            "firm",
            "client",
            "case_owner",
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
            "conflict_check",
            "analytics",
        ]
        read_only_fields = fields
