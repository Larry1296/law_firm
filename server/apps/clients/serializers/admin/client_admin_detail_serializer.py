from rest_framework import serializers

from apps.clients.models import Client
from apps.clients.serializers.client_detail_serializer import ClientDetailSerializer


class ClientAdminDetailSerializer(serializers.ModelSerializer):
    detail = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = ("id", "full_name", "detail")
        read_only_fields = fields

    def get_detail(self, obj):
        return ClientDetailSerializer(obj).data
