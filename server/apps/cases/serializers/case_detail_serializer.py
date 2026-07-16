from rest_framework import serializers

from apps.cases.models import Case
from apps.cases.serializers.case_activity_serializer import CaseActivitySerializer
from apps.cases.serializers.case_attachment_serializer import CaseAttachmentSerializer
from apps.cases.serializers.case_filing_serializer import CaseFilingSerializer
from apps.cases.serializers.case_note_serializer import CaseNoteSerializer
from apps.cases.serializers.case_party_serializer import CasePartySerializer
from apps.cases.serializers.case_task_serializer import CaseTaskSerializer
from apps.cases.serializers.case_timeline_serializer import CaseTimelineSerializer
from apps.events.serializers import EventSerializer


class CaseDetailSerializer(serializers.ModelSerializer):
    firm = serializers.SerializerMethodField()
    client = serializers.SerializerMethodField()
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
    analytics = serializers.SerializerMethodField()

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
            "title",
            "description",
            "firm",
            "case_type",
            "procedure_track",
            "status",
            "priority",
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
            "filing_date",
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
            "analytics",
        ]
        read_only_fields = fields
