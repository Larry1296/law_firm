from rest_framework import serializers

from apps.clients.serializers.admin.client_matter_conflict_check_serializer import ProposedMatterSerializer


from apps.clients.serializers.prospective_client_serializer import ProspectiveClientCreateSerializer


class ProposedMatterEntrySerializer(serializers.Serializer):
    client_id = serializers.UUIDField(required=False, allow_null=True)
    prospective_client = ProspectiveClientCreateSerializer(required=False)
    proposed_matter = ProposedMatterSerializer()

    def validate(self, attrs):
        if not attrs.get("client_id") and not attrs.get("prospective_client"):
            raise serializers.ValidationError("Select an existing client or provide a new prospective client.")
        if attrs.get("client_id") and attrs.get("prospective_client"):
            raise serializers.ValidationError("Select an existing client or create a new prospect, not both.")
        if not attrs["proposed_matter"].get("responsible_lawyer_id"):
            raise serializers.ValidationError({"proposed_matter": {"responsible_lawyer_id": "A responsible advocate is required."}})
        return attrs
