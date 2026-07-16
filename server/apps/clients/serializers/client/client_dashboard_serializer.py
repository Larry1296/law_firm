from rest_framework import serializers


class ClientDashboardSerializer(serializers.Serializer):
    client = serializers.DictField(read_only=True)
    firm = serializers.DictField(read_only=True)
    summary = serializers.DictField(read_only=True)
    recent_activity = serializers.ListField(read_only=True)
