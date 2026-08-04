from rest_framework import serializers

from apps.clients.models import ClientDocument, DocumentReleaseRequest


class DocumentReleaseRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentReleaseRequest
        fields = "__all__"
        read_only_fields = [field.name for field in DocumentReleaseRequest._meta.fields]


class DocumentReleaseCreateSerializer(serializers.Serializer):
    matter = serializers.UUIDField()
    purpose = serializers.CharField(allow_blank=False)
    proposed_recipient = serializers.CharField(allow_blank=False, max_length=255)


class DocumentReleaseDecisionSerializer(serializers.Serializer):
    approve = serializers.BooleanField()
    reason = serializers.CharField(allow_blank=False)


class DocumentReleaseCompleteSerializer(serializers.Serializer):
    released_to = serializers.CharField(allow_blank=False, max_length=255)
    recipient_identification = serializers.CharField(allow_blank=False, max_length=255)
    recipient_acknowledgement = serializers.CharField(allow_blank=False)
    acknowledgement_document = serializers.PrimaryKeyRelatedField(
        queryset=ClientDocument.objects.all(), required=False, allow_null=True
    )
