from apps.staff.models import SecretaryPermission
from apps.clients.models import Client


class SecretaryClientService:
    @staticmethod
    def get_secretary(user):
        secretary = getattr(user, "secretary_profile", None)
        if secretary is None:
            raise ValueError("Only secretaries can access this endpoint.")

        if not secretary.is_active:
            raise PermissionError("Secretary profile is inactive.")

        return secretary

    @staticmethod
    def ensure_can_manage_clients(user):
        secretary = SecretaryClientService.get_secretary(user)

        if not secretary.has_permission(SecretaryPermission.MANAGE_CLIENTS):
            raise PermissionError("Admin permission is required to manage clients.")

        return secretary

    @staticmethod
    def list_clients(user):
        secretary = SecretaryClientService.get_secretary(user)

        return Client.objects.filter(
            firm=secretary.law_firm,
            is_active=True,
        ).order_by("-created_at")
