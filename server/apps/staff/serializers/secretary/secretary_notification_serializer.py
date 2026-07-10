from rest_framework import serializers


class SecretaryNotificationSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)
    message = serializers.CharField(read_only=True)
    is_read = serializers.BooleanField(read_only=True)
    created_at = serializers.CharField(read_only=True)
