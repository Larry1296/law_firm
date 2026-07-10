# apps/permissions/permissions/is_admin.py

from rest_framework.permissions import BasePermission

from apps.permissions.services.permission_service import PermissionService


class IsAdmin(BasePermission):
    """
    Allows access only to administrators.
    """

    message = "Administrator access is required."

    def has_permission(self, request, view):
        return PermissionService.is_admin(request.user)