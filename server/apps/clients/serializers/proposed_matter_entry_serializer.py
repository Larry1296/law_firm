from rest_framework import serializers

from apps.clients.models import Client
from apps.clients.serializers.admin.client_matter_conflict_check_serializer import ProposedMatterSerializer


class ProspectiveClientInputSerializer(serializers.Serializer):
    legal_name = serializers.CharField(max_length=255)
    client_type = serializers.ChoiceField(choices=Client.ClientType.choices, required=False, default=Client.ClientType.INDIVIDUAL)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone_number = serializers.CharField(required=False, allow_blank=True, max_length=30)
    privacy = serializers.DictField()


class ProposedMatterEntrySerializer(serializers.Serializer):
    client_id = serializers.UUIDField(required=False, allow_null=True)
    prospective_client = ProspectiveClientInputSerializer(required=False)
    proposed_matter = ProposedMatterSerializer()

    def validate(self, attrs):
        if not attrs.get("client_id") and not attrs.get("prospective_client"):
            raise serializers.ValidationError("Select an existing client or provide a new prospective client.")
        if attrs.get("client_id") and attrs.get("prospective_client"):
            raise serializers.ValidationError("Select an existing client or create a new prospect, not both.")
        if not attrs["proposed_matter"].get("responsible_lawyer_id"):
            raise serializers.ValidationError({"proposed_matter": {"responsible_lawyer_id": "A responsible advocate is required."}})
        return attrs
