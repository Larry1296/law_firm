from rest_framework import serializers


class ClientDashboardSerializer(serializers.Serializer):
    summary = serializers.DictField(read_only=True)
    recent_activity = serializers.ListField(read_only=True)
