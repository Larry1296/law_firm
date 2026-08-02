from rest_framework import serializers


class MessageSerializer(serializers.Serializer):
    """A single message in the conversation history."""
    role = serializers.ChoiceField(choices=["user", "assistant"])
    content = serializers.CharField(max_length=4000)


class KnowledgeBaseAskSerializer(serializers.Serializer):
    """
    Payload for the /api/knowledge-base/ask/ endpoint.

    Fields:
        question  – the current user question (required).
        history   – prior conversation turns for multi-turn context (optional).
    """
    question = serializers.CharField(
        max_length=2000,
        trim_whitespace=True,
        error_messages={
            "blank": "Please enter a question.",
            "max_length": "Your question is too long (max 2 000 characters).",
        },
    )
    history = MessageSerializer(many=True, required=False, default=list)

    def validate_history(self, value):
        """Allow at most 20 prior turns to keep context manageable."""
        if len(value) > 20:
            return value[-20:]
        return value
