from apps.permissions.permissions.role_permissions import RolePermissions


class PermissionService:
    

    @staticmethod
    def is_admin(user):
        return (
            user.is_authenticated
            and user.role == RolePermissions.ADMIN
        )

    @staticmethod
    def is_staff(user):
        return (
            user.is_authenticated
            and user.role == RolePermissions.STAFF
        )

    @staticmethod
    def is_client(user):
        return (
            user.is_authenticated
            and user.role == RolePermissions.CLIENT
        )

    @staticmethod
    def is_portal_client(user):
        return (
            user.is_authenticated
            and user.role == RolePermissions.PORTAL_CLIENT
        )