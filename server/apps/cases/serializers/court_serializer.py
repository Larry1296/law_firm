from rest_framework import serializers

from apps.cases.models import Court


class CourtSerializer(serializers.ModelSerializer):
    court_type_display = serializers.CharField(source="get_court_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Court
        fields = [
            "id", "name", "court_type", "court_type_display", "level", "county",
            "station", "address", "jurisdiction", "phone", "email", "website",
            "status", "status_display", "created_at", "updated_at",
        ]

    def validate_level(self, value):
        if value < 1:
            raise serializers.ValidationError("Court level must be at least 1.")
        return value
