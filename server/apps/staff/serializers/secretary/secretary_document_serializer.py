from rest_framework import serializers


class SecretaryDocumentSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)
    document_type = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    related_to = serializers.CharField(read_only=True)
    uploaded_at = serializers.CharField(read_only=True)
