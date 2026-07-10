from django.db import transaction

from apps.staff.services.admin.lawyers.admin_lawyer_permission_service import (
    AdminLawyerPermissionService,
)


class AdminLawyerUpdateService:
    """
    Updates lawyer profile, user identity, and professional details.
    """

    @staticmethod
    @transaction.atomic
    def update_lawyer(*, lawyer, validated_data, updated_by):
        user = lawyer.user

        # User fields
        email = validated_data.pop("email", None)
        phone_number = validated_data.pop("phone_number", None)

        if email is not None:
            user.email = email

        if phone_number is not None:
            user.phone_number = phone_number

        user.save()

        # Lawyer fields
        practice_areas = validated_data.pop("practice_area_ids", None)
        permission_codes = validated_data.pop("permission_codes", None)

        for field, value in validated_data.items():
            setattr(lawyer, field, value)

        lawyer.save()

        if practice_areas is not None:
            lawyer.practice_areas.set(practice_areas)

        if permission_codes is not None:
            AdminLawyerPermissionService.sync_permissions(
                lawyer=lawyer,
                permission_codes=permission_codes,
                granted_by=updated_by,
            )

        return lawyer
