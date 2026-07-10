from django.db import transaction
from rest_framework import status
from rest_framework.response import Response

from apps.common.choices import EmploymentStatus, FirmRole
from apps.firm.models import LawFirmMember
from apps.firm.serializers.owner_lawyer_profile_serializer import (
    OwnerLawyerProfileSerializer,
)
from apps.firm.views.admin.admin_firm_base_view import AdminFirmBaseView
from apps.staff.models.lawyer import Lawyer, LawyerPermission
from apps.staff.services.admin.lawyers.admin_lawyer_number_service import (
    AdminLawyerNumberService,
)
from apps.staff.services.admin.lawyers.admin_lawyer_permission_service import (
    AdminLawyerPermissionService,
)
from apps.staff.serializers.admin.lawyers.admin_lawyer_detail_serializer import (
    AdminLawyerDetailSerializer,
)


class AdminOwnerLawyerProfileView(AdminFirmBaseView):
    def post(self, request):
        firm = self.get_firm()

        if hasattr(firm.owner, "lawyer_profile"):
            lawyer = firm.owner.lawyer_profile
            if lawyer.law_firm_id == firm.id:
                return Response(
                    {
                        "detail": "Firm owner is already registered as a lawyer.",
                        "lawyer": AdminLawyerDetailSerializer(lawyer).data,
                    },
                    status=status.HTTP_200_OK,
                )

            return Response(
                {"detail": "Firm owner already has a lawyer profile in another firm."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = OwnerLawyerProfileSerializer(
            data=request.data,
            context={"firm": firm},
        )
        serializer.is_valid(raise_exception=True)

        validated_data = dict(serializer.validated_data)
        practice_areas = validated_data.pop("practice_area_ids", [])
        staff_number = validated_data.pop("staff_number", None)
        if not staff_number:
            staff_number = AdminLawyerNumberService.generate_staff_number(firm)

        with transaction.atomic():
            lawyer = Lawyer.objects.create(
                user=firm.owner,
                law_firm=firm,
                staff_number=staff_number,
                firm_role=FirmRole.LAWYER,
                employment_status=EmploymentStatus.ACTIVE,
                is_active=True,
                **validated_data,
            )

            if practice_areas:
                lawyer.practice_areas.set(practice_areas)

            LawFirmMember.objects.update_or_create(
                firm=firm,
                user=firm.owner,
                defaults={
                    "role": FirmRole.LAWYER,
                    "created_by": request.user,
                    "is_active": True,
                },
            )

            AdminLawyerPermissionService.sync_permissions(
                lawyer=lawyer,
                permission_codes=[code for code, _ in LawyerPermission.choices],
                granted_by=request.user,
            )

        return Response(
            {
                "detail": "Firm owner registered as lawyer.",
                "lawyer": AdminLawyerDetailSerializer(lawyer).data,
            },
            status=status.HTTP_201_CREATED,
        )
