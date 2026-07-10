from django.contrib.auth import get_user_model

User = get_user_model()


class UserService:

    @staticmethod
    def get_user_profile(user_id):
        return User.objects.select_related(
            "profile",
            "firm",
        ).get(id=user_id)

    @staticmethod
    def create_user(**data):
        return User.objects.create_user(**data)

    @staticmethod
    def update_user(user, **data):

        for field, value in data.items():
            setattr(user, field, value)

        user.save(
            update_fields=data.keys()
        )

        return user