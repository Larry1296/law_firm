from apps.common.choices import UserRole


class RolePermissions:

    ADMIN = UserRole.ADMIN
    STAFF = UserRole.STAFF
    CLIENT = UserRole.OFFICIAL_CLIENT
    PROSPECT = UserRole.PROSPECT

    STAFF_ROLES = [
        STAFF,
    ]

    INTERNAL_USERS = [
        ADMIN,
        STAFF,
    ]

    CLIENT_USERS = [
        CLIENT,
        PROSPECT,
    ]
