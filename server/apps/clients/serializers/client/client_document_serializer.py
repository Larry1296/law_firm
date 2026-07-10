from rest_framework import serializers


class ClientDocumentSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)
    category = serializers.CharField(read_only=True)
    uploaded_at = serializers.CharField(read_only=True)
