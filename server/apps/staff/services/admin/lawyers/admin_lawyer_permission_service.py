from apps.staff.models.lawyer import LawyerPermissionGrant


class AdminLawyerPermissionService:
    @staticmethod
    def sync_permissions(*, lawyer, permission_codes, granted_by):
        permission_codes = set(permission_codes or [])

        for grant in lawyer.permissions.all():
            grant.is_active = grant.code in permission_codes
            grant.save(update_fields=["is_active", "updated_at"])

        existing_codes = set(lawyer.permissions.values_list("code", flat=True))

        for code in permission_codes - existing_codes:
            LawyerPermissionGrant.objects.create(
                lawyer=lawyer,
                code=code,
                is_active=True,
                granted_by=granted_by,
            )

        return lawyer
