from django.db import transaction

from apps.common.choices import EmploymentStatus, FirmRole, UserRole
from apps.firm.models.firm_member import LawFirmMember
from apps.staff.models import Secretary
from apps.staff.services.admin.secretaries.admin_secretary_number_service import (
    AdminSecretaryNumberService,
)
from apps.staff.services.admin.secretaries.admin_secretary_permission_service import (
    AdminSecretaryPermissionService,
)
from apps.users.services.auth_service import AuthService


class AdminSecretaryCreateService:
    @staticmethod
    @transaction.atomic
    def create_secretary(*, law_firm, validated_data, created_by):
        assigned_lawyers = validated_data.pop("assigned_lawyer_ids", [])
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
            staff_number = AdminSecretaryNumberService.generate_staff_number(law_firm)

        department_unit = validated_data.get("department_unit")
        if department_unit is not None and not validated_data.get("department"):
            validated_data["department"] = department_unit.name

        secretary = Secretary.objects.create(
            user=user,
            law_firm=law_firm,
            staff_number=staff_number,
            firm_role=FirmRole.SECRETARY,
            employment_status=EmploymentStatus.ACTIVE,
            is_active=True,
            **validated_data,
        )

        if assigned_lawyers:
            secretary.assigned_lawyers.set(assigned_lawyers)

        if permission_codes:
            AdminSecretaryPermissionService.sync_permissions(
                secretary=secretary,
                permission_codes=permission_codes,
                granted_by=created_by,
            )

        LawFirmMember.objects.create(
            firm=law_firm,
            user=user,
            role=FirmRole.SECRETARY,
            created_by=created_by,
            is_active=True,
        )

        return secretary, temp_password
