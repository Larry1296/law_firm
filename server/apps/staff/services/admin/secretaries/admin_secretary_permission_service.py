from apps.staff.models import SecretaryPermissionGrant


class AdminSecretaryPermissionService:
    @staticmethod
    def sync_permissions(*, secretary, permission_codes, granted_by):
        permission_codes = set(permission_codes or [])

        for grant in secretary.permissions.all():
            grant.is_active = grant.code in permission_codes
            grant.save(update_fields=["is_active", "updated_at"])

        existing_codes = set(secretary.permissions.values_list("code", flat=True))

        for code in permission_codes - existing_codes:
            SecretaryPermissionGrant.objects.create(
                secretary=secretary,
                code=code,
                is_active=True,
                granted_by=granted_by,
            )

        return secretary
