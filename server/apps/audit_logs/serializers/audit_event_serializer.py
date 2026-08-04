from rest_framework import serializers

from apps.audit_logs.models import AuditEvent


class AuditEventSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = AuditEvent
        fields = "__all__"
