from rest_framework.permissions import BasePermission

from apps.permissions.services.permission_service import PermissionService


class IsProspect(BasePermission):
    """
    Allows access only to prospects.
    """

    message = "Prospect access is required."

    def has_permission(self, request, view):
        return PermissionService.is_prospect(request.user)
