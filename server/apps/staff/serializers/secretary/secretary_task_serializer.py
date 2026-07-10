from rest_framework import serializers


class SecretaryTaskSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)
    priority = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    due_date = serializers.CharField(read_only=True)
    assigned_by = serializers.CharField(read_only=True)
