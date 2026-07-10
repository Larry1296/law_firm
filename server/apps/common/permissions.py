from rest_framework.permissions import BasePermission

from apps.common.choices import UserRole


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == UserRole.ADMIN
        )


class IsSecretary(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == UserRole.SECRETARY
        )


class IsLawyer(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == UserRole.LAWYER
        )