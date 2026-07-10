from rest_framework import serializers


class LawyerDashboardSerializer(serializers.Serializer):
    lawyer = serializers.DictField(read_only=True)
    summary = serializers.DictField(read_only=True)
    upcoming = serializers.DictField(read_only=True)
    recent_activity = serializers.ListField(read_only=True)
