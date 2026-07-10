class SecretaryProfileService:
    @staticmethod
    def get_secretary_profile(user):
        if not hasattr(user, "secretary_profile"):
            raise ValueError("Only secretaries can access this endpoint.")
        return user.secretary_profile

    @staticmethod
    def update_secretary_profile(user, data):
        secretary = SecretaryProfileService.get_secretary_profile(user)
        allowed_fields = ["work_phone", "office_location", "notes"]

        for field in allowed_fields:
            if field in data:
                setattr(secretary, field, data[field])

        secretary.save()
        return secretary
