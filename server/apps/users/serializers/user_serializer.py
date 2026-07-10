from rest_framework import serializers

from apps.users.models import User


class UserSerializer(serializers.ModelSerializer):

    full_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "phone_number",
            "national_id_number",
            "role",
            "firm_role",
            "firm",
        )