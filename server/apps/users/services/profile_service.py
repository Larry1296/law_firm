class ProfileService:

    @staticmethod
    def update_profile(profile, **data):

        for field, value in data.items():
            setattr(profile, field, value)

        profile.save(
            update_fields=data.keys()
        )

        return profile