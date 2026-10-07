from rest_framework import serializers

MAX_LOGO_BYTES = 2 * 1024 * 1024


class LogoSerializer(serializers.Serializer):
    """A firm logo upload. LawFirm.save() squares and resizes it, whatever its shape."""

    logo = serializers.ImageField()

    def validate_logo(self, value):
        if value.size > MAX_LOGO_BYTES:
            raise serializers.ValidationError("The logo must be 2 MB or smaller.")
        return value
