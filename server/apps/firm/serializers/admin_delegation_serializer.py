from rest_framework import serializers


class AdminDelegationSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
