from rest_framework import serializers


class CaseAssignmentSerializer(serializers.Serializer):
    membership_id = serializers.UUIDField()
