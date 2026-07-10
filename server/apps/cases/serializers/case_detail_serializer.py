from rest_framework import serializers

from apps.cases.models import Case
from apps.cases.serializers.case_activity_serializer import CaseActivitySerializer
from apps.cases.serializers.case_timeline_serializer import CaseTimelineSerializer


class CaseDetailSerializer(serializers.ModelSerializer):
    client = serializers.SerializerMethodField()
    assigned_lawyer = serializers.SerializerMethodField()
    assigned_secretary = serializers.SerializerMethodField()
    timeline = CaseTimelineSerializer(many=True, read_only=True)
    events = serializers.SerializerMethodField()
    documents = serializers.SerializerMethodField()
    activities = CaseActivitySerializer(many=True, read_only=True)
    analytics = serializers.SerializerMethodField()

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
        return []

    def get_documents(self, obj):
        return []

    def get_analytics(self, obj):
        return {
            "timeline_count": obj.timeline.count(),
            "events_count": 0,
            "documents_count": 0,
            "activity_score": obj.activities.count() + obj.timeline.count(),
            "age_days": (obj.updated_at.date() - obj.created_at.date()).days,
            "has_events": False,
            "has_documents": False,
        }

    class Meta:
        model = Case
        fields = [
            "id",
            "case_number",
            "title",
            "description",
            "case_type",
            "status",
            "priority",
            "court_type",
            "court_name",
            "court_location",
            "filing_date",
            "plaintiff",
            "defendant",
            "client",
            "assigned_lawyer",
            "assigned_secretary",
            "is_active",
            "closed_at",
            "created_at",
            "updated_at",
            "timeline",
            "events",
            "documents",
            "activities",
            "analytics",
        ]
        read_only_fields = fields
