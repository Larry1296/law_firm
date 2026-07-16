from apps.clients.models import Client


class ClientProfileService:
    @staticmethod
    def get_client_profile(user):
        if not hasattr(user, "client_profile"):
            raise ValueError("Only client users can access this endpoint.")
        return (
            Client.objects.select_related("firm", "user")
            .get(id=user.client_profile.id)
        )
