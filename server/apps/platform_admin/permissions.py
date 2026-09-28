from rest_framework.permissions import BasePermission

from apps.common.choices import UserRole


class IsPlatformAdmin(BasePermission):
    """The operator of the platform. Firm administrators are not platform administrators."""

    message = "Platform administrator access is required."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role == UserRole.PLATFORM_ADMIN)
