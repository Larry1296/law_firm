from rest_framework import serializers


class SecretaryCalendarSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)
    starts_at = serializers.CharField(read_only=True)
    ends_at = serializers.CharField(read_only=True)
    location = serializers.CharField(read_only=True)
    related_to = serializers.CharField(read_only=True)
