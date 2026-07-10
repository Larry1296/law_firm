from rest_framework.permissions import BasePermission

from apps.permissions.services.permission_service import PermissionService


class IsStaff(BasePermission):
    """
    Allows access only to internal staff members.
    """

    message = "Staff access is required."

    def has_permission(self, request, view):
        return PermissionService.is_staff(request.user)