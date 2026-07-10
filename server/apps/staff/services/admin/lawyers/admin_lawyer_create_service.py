from django.db import transaction

from apps.common.choices import EmploymentStatus, FirmRole, UserRole
from apps.firm.models.firm_member import LawFirmMember
from apps.staff.models.lawyer import Lawyer
from apps.staff.services.admin.lawyers.admin_lawyer_number_service import (
    AdminLawyerNumberService,
)
from apps.staff.services.admin.lawyers.admin_lawyer_permission_service import (
    AdminLawyerPermissionService,
)
from apps.users.services.auth_service import AuthService


class AdminLawyerCreateService:
    """
    Creates a lawyer from the admin side.

    This creates:
    - User
    - Lawyer profile
    - Law firm membership
    """

    @staticmethod
    @transaction.atomic
    def create_lawyer(*, law_firm, validated_data, created_by):
        practice_areas = validated_data.pop("practice_area_ids", [])
        permission_codes = validated_data.pop("permission_codes", [])

        user, temp_password = AuthService.create_user_with_temp_password(
            email=validated_data.pop("email"),
            first_name=validated_data.pop("first_name"),
            last_name=validated_data.pop("last_name"),
            phone_number=validated_data.pop("phone_number"),
            national_id_number=validated_data.pop("national_id_number"),
            role=UserRole.STAFF,
        )

        staff_number = validated_data.pop("staff_number", None)
        if not staff_number:
            staff_number = AdminLawyerNumberService.generate_staff_number(law_firm)

        department_unit = validated_data.get("department_unit")
        if department_unit is not None and not validated_data.get("department"):
            validated_data["department"] = department_unit.name

        lawyer = Lawyer.objects.create(
            user=user,
            law_firm=law_firm,
            staff_number=staff_number,
            firm_role=FirmRole.LAWYER,
            employment_status=EmploymentStatus.ACTIVE,
            is_active=True,
            **validated_data,
        )

        if practice_areas:
            lawyer.practice_areas.set(practice_areas)

        if permission_codes:
            AdminLawyerPermissionService.sync_permissions(
                lawyer=lawyer,
                permission_codes=permission_codes,
                granted_by=created_by,
            )

        LawFirmMember.objects.create(
            firm=law_firm,
            user=user,
            role=FirmRole.LAWYER,
            created_by=created_by,
            is_active=True,
        )

        return lawyer, temp_password
