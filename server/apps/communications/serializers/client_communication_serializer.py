from rest_framework import serializers

from apps.communications.models import ClientCommunication


class ClientCommunicationSerializer(serializers.ModelSerializer):
    amendments = serializers.SerializerMethodField()

    class Meta:
        model = ClientCommunication
        fields = "__all__"
        read_only_fields = ("firm", "matter", "client", "created_by")

    def get_amendments(self, obj):
        return [{"previous_values": x.previous_values, "new_values": x.new_values,
                 "reason": x.reason, "actor": x.actor.full_name, "created_at": x.created_at}
                for x in obj.amendments.all()]


class CommunicationAmendSerializer(serializers.Serializer):
    changes = serializers.JSONField()
    reason = serializers.CharField()
