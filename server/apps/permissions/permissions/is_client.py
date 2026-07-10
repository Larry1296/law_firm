from rest_framework.permissions import BasePermission

from apps.permissions.services.permission_service import PermissionService


class IsClient(BasePermission):
    """
    Allows access only to official clients.
    """

    message = "Client access is required."

    def has_permission(self, request, view):
        return PermissionService.is_client(request.user)