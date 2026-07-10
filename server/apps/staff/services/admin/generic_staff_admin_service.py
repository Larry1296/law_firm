from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.common.choices import EmploymentStatus, UserRole
from apps.firm.models.firm_member import LawFirmMember
from apps.users.services.auth_service import AuthService


class GenericStaffAdminService:
    @staticmethod
    def base_queryset(*, model, law_firm):
        return (
            model.objects.filter(law_firm=law_firm)
            .select_related("user", "law_firm", "reports_to")
            .prefetch_related("permissions")
        )

    @staticmethod
    def list_staff(*, model, law_firm, employment_status=None, is_active=None, search=None):
        queryset = GenericStaffAdminService.base_queryset(model=model, law_firm=law_firm)

        if employment_status:
            queryset = queryset.filter(employment_status=employment_status)

        if is_active is not None:
            if isinstance(is_active, str):
                is_active = is_active.lower() in ["1", "true", "yes"]
            queryset = queryset.filter(is_active=is_active)

        if search:
            queryset = queryset.filter(
                Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(user__email__icontains=search)
                | Q(staff_number__icontains=search)
                | Q(employee_number__icontains=search)
                | Q(department__icontains=search)
                | Q(job_title__icontains=search)
            )

        return queryset.distinct()

    @staticmethod
    def get_staff(*, model, staff_id, law_firm):
        return GenericStaffAdminService.base_queryset(
            model=model,
            law_firm=law_firm,
        ).get(id=staff_id)

    @staticmethod
    def generate_staff_number(*, model, law_firm, prefix):
        total = model.objects.filter(law_firm=law_firm).count() + 1
        return f"{prefix}-{total:04d}"

    @staticmethod
    @transaction.atomic
    def create_staff(
        *,
        model,
        permission_model,
        permission_relation_name,
        firm_role,
        staff_number_prefix,
        law_firm,
        validated_data,
        created_by,
    ):
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
            staff_number = GenericStaffAdminService.generate_staff_number(
                model=model,
                law_firm=law_firm,
                prefix=staff_number_prefix,
            )

        department_unit = validated_data.get("department_unit")
        if department_unit is not None and not validated_data.get("department"):
            validated_data["department"] = department_unit.name

        staff = model.objects.create(
            user=user,
            law_firm=law_firm,
            staff_number=staff_number,
            firm_role=firm_role,
            employment_status=EmploymentStatus.ACTIVE,
            is_active=True,
            **validated_data,
        )

        GenericStaffAdminService.sync_permissions(
            staff=staff,
            permission_model=permission_model,
            permission_relation_name=permission_relation_name,
            permission_codes=permission_codes,
            granted_by=created_by,
        )

        LawFirmMember.objects.create(
            firm=law_firm,
            user=user,
            role=firm_role,
            created_by=created_by,
            is_active=True,
        )

        return staff, temp_password

    @staticmethod
    @transaction.atomic
    def update_staff(
        *,
        staff,
        permission_model,
        permission_relation_name,
        validated_data,
        updated_by,
    ):
        permission_codes = validated_data.pop("permission_codes", None)
        email = validated_data.pop("email", None)
        phone_number = validated_data.pop("phone_number", None)

        if email is not None:
            staff.user.email = email
        if phone_number is not None:
            staff.user.phone_number = phone_number
        if email is not None or phone_number is not None:
            staff.user.save()

        for field, value in validated_data.items():
            setattr(staff, field, value)

        staff.save()

        if permission_codes is not None:
            GenericStaffAdminService.sync_permissions(
                staff=staff,
                permission_model=permission_model,
                permission_relation_name=permission_relation_name,
                permission_codes=permission_codes,
                granted_by=updated_by,
            )

        return staff

    @staticmethod
    def sync_permissions(
        *,
        staff,
        permission_model,
        permission_relation_name,
        permission_codes,
        granted_by,
    ):
        permission_codes = set(permission_codes or [])

        for grant in staff.permissions.all():
            grant.is_active = grant.code in permission_codes
            grant.save(update_fields=["is_active", "updated_at"])

        existing_codes = set(staff.permissions.values_list("code", flat=True))

        for code in permission_codes - existing_codes:
            permission_model.objects.create(
                **{
                    permission_relation_name: staff,
                    "code": code,
                    "is_active": True,
                    "granted_by": granted_by,
                }
            )

        return staff

    @staticmethod
    @transaction.atomic
    def delete_staff(*, staff, deleted_by):
        staff.user.delete()
        return staff

    @staticmethod
    def activate_staff(*, staff, updated_by):
        staff.is_active = True
        staff.employment_status = EmploymentStatus.ACTIVE
        staff.date_terminated = None
        staff.termination_reason = None
        staff.user.is_active = True
        staff.user.save(update_fields=["is_active"])
        staff.save()
        return staff

    @staticmethod
    def deactivate_staff(*, staff, updated_by):
        staff.is_active = False
        staff.employment_status = EmploymentStatus.SUSPENDED
        staff.user.is_active = False
        staff.user.save(update_fields=["is_active"])
        staff.save()
        return staff

    @staticmethod
    def change_status(*, staff, employment_status, updated_by, termination_reason=None):
        staff.employment_status = employment_status

        if employment_status == EmploymentStatus.TERMINATED:
            staff.is_active = False
            staff.date_terminated = timezone.now().date()
            staff.termination_reason = termination_reason
            staff.user.is_active = False
        elif employment_status == EmploymentStatus.ACTIVE:
            staff.is_active = True
            staff.date_terminated = None
            staff.termination_reason = None
            staff.user.is_active = True

        staff.user.save(update_fields=["is_active"])
        staff.save()
        return staff
