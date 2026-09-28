from rest_framework import serializers


class RecoverAccountSerializer(serializers.Serializer):
    national_id = serializers.CharField(max_length=20, required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def validate(self, data):
        data = {key: (value or "").strip() for key, value in data.items()}
        if not data.get("national_id") and not data.get("phone_number"):
            raise serializers.ValidationError("Enter your National ID or phone number.")
        return data
