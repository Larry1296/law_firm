from apps.common.choices import UserRole


class RolePermissions:

    ADMIN = UserRole.ADMIN
    LAWYER = UserRole.LAWYER
    SECRETARY = UserRole.SECRETARY
    CLIENT = UserRole.CLIENT
    PROSPECT = UserRole.PROSPECT

    STAFF_ROLES = [
        LAWYER,
        SECRETARY,
    ]

    INTERNAL_USERS = [
        ADMIN,
        LAWYER,
        SECRETARY,
    ]

    CLIENT_USERS = [
        CLIENT,
        PORTAL_CLIENT,
    ]