from rest_framework import serializers

from apps.cases.models import Case


class ClientCaseSerializer(serializers.ModelSerializer):
    firm = serializers.SerializerMethodField()
    client = serializers.SerializerMethodField()
    plaintiff_name = serializers.SerializerMethodField()
    case_owner = serializers.SerializerMethodField()
    timeline = serializers.SerializerMethodField()
    activities = serializers.SerializerMethodField()
    analytics = serializers.SerializerMethodField()

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
            "activity_count": obj.activities.count(),
            "age_days": (obj.updated_at.date() - obj.created_at.date()).days,
        }

    class Meta:
        model = Case
        fields = [
            "id",
            "case_number",
            "title",
            "description",
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
            "firm",
            "client",
            "case_owner",
            "is_active",
            "closed_at",
            "created_at",
            "updated_at",
            "timeline",
            "activities",
            "analytics",
        ]
        read_only_fields = fields
