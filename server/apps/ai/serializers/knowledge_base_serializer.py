from rest_framework import serializers


class HistoryMessageSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=("user", "assistant"))
    content = serializers.CharField(max_length=1500, trim_whitespace=True)


class KnowledgeBaseAskSerializer(serializers.Serializer):
    question = serializers.CharField(max_length=1200, trim_whitespace=True)
    history = HistoryMessageSerializer(many=True, required=False, default=list)
    page_context = serializers.DictField(required=False, default=dict)

    def validate_question(self, value):
        if not value.strip():
            raise serializers.ValidationError("Please enter a question.")
        return value.strip()

    def validate_history(self, value):
        if len(value) > 10:
            raise serializers.ValidationError("History may contain at most 10 messages.")
        return value

    def validate_page_context(self, value):
        if set(value) - {"section"}:
            raise serializers.ValidationError("Page context contains unsupported fields.")
        section = value.get("section", "home")
        allowed = {"home", "about", "practice_areas", "consultation", "contact"}
        if section not in allowed:
            raise serializers.ValidationError("Unknown homepage section.")
        return {"section": section}
