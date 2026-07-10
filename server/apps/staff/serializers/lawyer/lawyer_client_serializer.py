from rest_framework import serializers


class LawyerClientSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    phone_number = serializers.CharField(read_only=True)
    matter_type = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    last_contact = serializers.CharField(read_only=True)
