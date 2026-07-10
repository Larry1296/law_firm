from rest_framework import serializers

from apps.users.models import Profile


class ProfileSerializer(serializers.ModelSerializer):

    class Meta:
        model = Profile
        fields = (
            "profile_photo",
            "address",
            "bio",
        )