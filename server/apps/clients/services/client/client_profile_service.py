from apps.clients.models import Client


class ClientProfileService:
    @staticmethod
    def get_client_profile(user):
        if not hasattr(user, "client_profile"):
            raise ValueError("Only client users can access this endpoint.")
        return user.client_profile
