from rest_framework import serializers


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(
        write_only=True,
        required=True,
    )

    new_password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=8,
    )

    confirm_password = serializers.CharField(
        write_only=True,
        required=True,
    )

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {
                    "confirm_password": (
                        "Passwords do not match."
                    )
                }
            )

        return attrs