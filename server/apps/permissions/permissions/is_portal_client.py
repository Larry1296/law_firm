from rest_framework.permissions import BasePermission

from apps.permissions.services.permission_service import PermissionService


class IsPortalClient(BasePermission):
    """
    Allows access only to portal clients.
    """

    message = "Portal client access is required."

    def has_permission(self, request, view):
        return PermissionService.is_portal_client(request.user)