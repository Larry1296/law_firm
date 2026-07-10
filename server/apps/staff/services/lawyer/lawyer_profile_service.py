from apps.staff.models.lawyer import Lawyer


class LawyerProfileService:
    @staticmethod
    def get_lawyer_profile(user):
        if not hasattr(user, "lawyer_profile"):
            raise ValueError("Only lawyers can access this endpoint.")
        return user.lawyer_profile

    @staticmethod
    def update_lawyer_profile(user, validated_data):
        lawyer = LawyerProfileService.get_lawyer_profile(user)

        if "first_name" in validated_data:
            lawyer.user.first_name = validated_data.pop("first_name")
        if "last_name" in validated_data:
            lawyer.user.last_name = validated_data.pop("last_name")
        if "email" in validated_data:
            lawyer.user.email = validated_data.pop("email")
        if "phone_number" in validated_data:
            lawyer.user.phone_number = validated_data.pop("phone_number")

        for field, value in validated_data.items():
            setattr(lawyer, field, value)

        lawyer.user.save(update_fields=["first_name", "last_name", "email", "phone_number"])
        lawyer.save()
        return lawyer
