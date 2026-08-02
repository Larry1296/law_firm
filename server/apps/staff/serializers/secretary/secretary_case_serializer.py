from rest_framework import serializers

from apps.cases.models import Case


class SecretaryCaseSerializer(serializers.ModelSerializer):
    """Deliberately excludes legal strategy, advice, evidence analysis and privileged notes."""

    client = serializers.SerializerMethodField()
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    plaintiff_name = serializers.SerializerMethodField()
    case_owner = serializers.SerializerMethodField()
    assigned_lawyer = serializers.SerializerMethodField()
    court_stage_label = serializers.CharField(source="get_court_stage_display", read_only=True)
    matter_status_label = serializers.CharField(source="get_matter_status_display", read_only=True)
    document_requests = serializers.SerializerMethodField()
    physical_matter_file = serializers.SerializerMethodField()

    def get_physical_matter_file(self, obj):
        from apps.cases.services.matter_physical_file_service import MatterPhysicalFileService
        try:
            return MatterPhysicalFileService.serialize(obj.physical_file)
        except Exception:
            return None

    def get_client(self, obj):
        return {"id": str(obj.client_id), "full_name": obj.client.full_name,
                "email": obj.client.email, "phone_number": obj.client.phone_number,
                "access_type": obj.client.access_type,
                "portal_access_exists": bool(obj.client.user_id and obj.client.user.is_active)}

    def get_plaintiff_name(self, obj):
        party = obj.parties.filter(client=obj.client, is_our_client=True).first()
        return party.name if party else obj.plaintiff or obj.client.full_name

    def get_case_owner(self, obj):
        party = obj.parties.filter(client=obj.client, is_our_client=True).first()
        return {
            "id": str(obj.client_id),
            "client_id": str(obj.client_id),
            "full_name": party.name if party else obj.plaintiff or obj.client.full_name,
            "party_role": party.party_role if party else "PLAINTIFF",
            "party_role_label": party.get_party_role_display() if party else "Plaintiff",
        }

    def get_assigned_lawyer(self, obj):
        lawyer = obj.assigned_lawyer
        return {"id": str(lawyer.id), "name": lawyer.user.full_name} if lawyer else None

    def get_document_requests(self, obj):
        from apps.documents.services.workflow_service import DocumentWorkflowService
        return [DocumentWorkflowService.serialize_request(item) for item in obj.document_requests.all()]

    class Meta:
        model = Case
        fields = [
            "id", "case_number", "official_court_case_number", "title",
            "matter_status", "matter_status_label", "court_stage",
            "court_stage_label", "next_court_date",
            "client", "client_name", "plaintiff_name", "case_owner",
            "assigned_lawyer", "assigned_secretary", "document_requests",
            "physical_matter_file",
            "created_at", "updated_at",
        ]
        read_only_fields = fields
