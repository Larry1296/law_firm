from rest_framework import serializers


class GenerateCaseAssessmentSerializer(serializers.Serializer):
    document_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, default=list, max_length=50
    )
    confirm_external_processing = serializers.BooleanField(default=False, required=False)


class AIFindingFeedbackSerializer(serializers.Serializer):
    finding_key = serializers.CharField(max_length=160)
    rating = serializers.ChoiceField(choices=("USEFUL", "INCORRECT", "INCOMPLETE", "IRRELEVANT", "OUTDATED"))
    correction = serializers.CharField(max_length=3000, required=False, allow_blank=True, default="")
