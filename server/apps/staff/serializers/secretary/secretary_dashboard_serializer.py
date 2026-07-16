from rest_framework import serializers


class SecretaryDashboardSerializer(serializers.Serializer):
    profile = serializers.DictField()
    summary = serializers.DictField()
    permissions = serializers.ListField(child=serializers.CharField())
    default_work = serializers.DictField()
    recent_notifications = serializers.ListField(child=serializers.DictField())
    recent_activity = serializers.ListField(child=serializers.DictField())
