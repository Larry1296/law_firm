from django.db import transaction

from apps.staff.services.admin.secretaries.admin_secretary_permission_service import (
    AdminSecretaryPermissionService,
)


class AdminSecretaryUpdateService:
    @staticmethod
    @transaction.atomic
    def update_secretary(*, secretary, validated_data, updated_by):
        assigned_lawyers = validated_data.pop("assigned_lawyer_ids", None)
        permission_codes = validated_data.pop("permission_codes", None)

        email = validated_data.pop("email", None)
        phone_number = validated_data.pop("phone_number", None)

        if email is not None:
            secretary.user.email = email
        if phone_number is not None:
            secretary.user.phone_number = phone_number
        if email is not None or phone_number is not None:
            secretary.user.save()

        for field, value in validated_data.items():
            setattr(secretary, field, value)

        secretary.save()

        if assigned_lawyers is not None:
            secretary.assigned_lawyers.set(assigned_lawyers)

        if permission_codes is not None:
            AdminSecretaryPermissionService.sync_permissions(
                secretary=secretary,
                permission_codes=permission_codes,
                granted_by=updated_by,
            )

        return secretary
