from rest_framework import serializers

from apps.clients.models import Client
from apps.users.models import User


class RegisterClientSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    national_id = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    phone_number = serializers.CharField(max_length=30)
    client_type = serializers.ChoiceField(choices=Client.ClientType.choices)
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_phone_number(self, value):
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("An account with this phone number already exists.")
        return value

    def validate_national_id(self, value):
        if value and User.objects.filter(national_id_number=value).exists():
            raise serializers.ValidationError("An account with this national ID already exists.")
        return value
