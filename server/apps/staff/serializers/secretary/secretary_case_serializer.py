from rest_framework import serializers

from apps.cases.models import Case


class SecretaryCaseSerializer(serializers.ModelSerializer):
    """Deliberately excludes legal strategy, advice, evidence analysis and privileged notes."""

    client = serializers.SerializerMethodField()
    assigned_lawyer = serializers.SerializerMethodField()
    court_stage_label = serializers.CharField(source="get_court_stage_display", read_only=True)
    matter_status_label = serializers.CharField(source="get_matter_status_display", read_only=True)
    document_requests = serializers.SerializerMethodField()

    def get_client(self, obj):
        return {"id": str(obj.client_id), "full_name": obj.client.full_name,
                "email": obj.client.email, "phone_number": obj.client.phone_number,
                "access_type": obj.client.access_type}

    def get_assigned_lawyer(self, obj):
        lawyer = obj.assigned_lawyer
        return {"id": str(lawyer.id), "name": lawyer.user.full_name} if lawyer else None

    def get_document_requests(self, obj):
        from apps.documents.services.workflow_service import DocumentWorkflowService
        return [DocumentWorkflowService.serialize_request(item) for item in obj.document_requests.all()]

    class Meta:
        model = Case
        fields = ["id", "case_number", "official_court_case_number", "title", "matter_status",
                  "matter_status_label", "court_stage", "court_stage_label", "next_court_date",
                  "client", "assigned_lawyer", "assigned_secretary", "document_requests",
                  "created_at", "updated_at"]
