from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.staff.services.admin.generic_staff_admin_service import (
    GenericStaffAdminService,
)
from apps.staff.views.admin.admin_firm_resolver import get_admin_law_firm


class GenericAdminStaffBaseView(APIView):
    permission_classes = [IsAuthenticated]
    model = None
    permission_model = None
    permission_relation_name = None
    firm_role = None
    staff_number_prefix = None
    staff_response_key = "staff"
    list_response_key = "staff"
    create_serializer_class = None
    list_serializer_class = None
    detail_serializer_class = None
    update_serializer_class = None
    change_status_serializer_class = None
    permission_serializer_class = None
    not_found_message = "Staff member not found."

    def get_law_firm(self):
        return get_admin_law_firm(self.request.user)

    def get_staff(self, staff_id):
        return GenericStaffAdminService.get_staff(
            model=self.model,
            staff_id=staff_id,
            law_firm=self.get_law_firm(),
        )

    def serialize_detail(self, staff):
        return self.detail_serializer_class(staff).data


class GenericAdminStaffListView(GenericAdminStaffBaseView):
    def get(self, request):
        staff = GenericStaffAdminService.list_staff(
            model=self.model,
            law_firm=self.get_law_firm(),
            employment_status=request.query_params.get("employment_status"),
            is_active=request.query_params.get("is_active"),
            search=request.query_params.get("search"),
        )
        serializer = self.list_serializer_class(staff, many=True)
        return Response(
            {
                self.list_response_key: serializer.data,
                "metadata": {
                    "total_records": staff.count(),
                    "summary": {
                        "active": staff.filter(is_active=True).count(),
                        "inactive": staff.filter(is_active=False).count(),
                    },
                },
            },
            status=status.HTTP_200_OK,
        )


class GenericAdminStaffCreateView(GenericAdminStaffBaseView):
    def post(self, request):
        law_firm = self.get_law_firm()
        serializer = self.create_serializer_class(
            data=request.data,
            context={"law_firm": law_firm},
        )
        serializer.is_valid(raise_exception=True)
        staff, temp_password = GenericStaffAdminService.create_staff(
            model=self.model,
            permission_model=self.permission_model,
            permission_relation_name=self.permission_relation_name,
            firm_role=self.firm_role,
            staff_number_prefix=self.staff_number_prefix,
            law_firm=law_firm,
            validated_data=serializer.validated_data,
            created_by=request.user,
        )
        staff = self.get_staff(staff.id)
        return Response(
            {
                self.staff_response_key: self.serialize_detail(staff),
                "temp_password": temp_password,
            },
            status=status.HTTP_201_CREATED,
        )


class GenericAdminStaffDetailView(GenericAdminStaffBaseView):
    def get(self, request, staff_id):
        try:
            staff = self.get_staff(staff_id)
        except Exception:
            return Response(
                {"detail": self.not_found_message},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            {self.staff_response_key: self.serialize_detail(staff)},
            status=status.HTTP_200_OK,
        )


class GenericAdminStaffUpdateView(GenericAdminStaffBaseView):
    def patch(self, request, staff_id):
        staff = self.get_staff(staff_id)
        serializer = self.update_serializer_class(staff, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        staff = GenericStaffAdminService.update_staff(
            staff=staff,
            permission_model=self.permission_model,
            permission_relation_name=self.permission_relation_name,
            validated_data=serializer.validated_data,
            updated_by=request.user,
        )
        return Response(
            {self.staff_response_key: self.serialize_detail(staff)},
            status=status.HTTP_200_OK,
        )


class GenericAdminStaffDeleteView(GenericAdminStaffBaseView):
    def delete(self, request, staff_id):
        staff = self.get_staff(staff_id)
        GenericStaffAdminService.delete_staff(staff=staff, deleted_by=request.user)
        return Response(
            {"detail": "Staff member deleted successfully."},
            status=status.HTTP_200_OK,
        )


class GenericAdminStaffActivateView(GenericAdminStaffBaseView):
    def post(self, request, staff_id):
        staff = self.get_staff(staff_id)
        staff = GenericStaffAdminService.activate_staff(
            staff=staff,
            updated_by=request.user,
        )
        return Response(
            {self.staff_response_key: self.serialize_detail(staff)},
            status=status.HTTP_200_OK,
        )


class GenericAdminStaffDeactivateView(GenericAdminStaffBaseView):
    def post(self, request, staff_id):
        staff = self.get_staff(staff_id)
        staff = GenericStaffAdminService.deactivate_staff(
            staff=staff,
            updated_by=request.user,
        )
        return Response(
            {self.staff_response_key: self.serialize_detail(staff)},
            status=status.HTTP_200_OK,
        )


class GenericAdminStaffChangeStatusView(GenericAdminStaffBaseView):
    def post(self, request, staff_id):
        serializer = self.change_status_serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        staff = self.get_staff(staff_id)
        staff = GenericStaffAdminService.change_status(
            staff=staff,
            employment_status=serializer.validated_data["employment_status"],
            termination_reason=serializer.validated_data.get("termination_reason"),
            updated_by=request.user,
        )
        return Response(
            {self.staff_response_key: self.serialize_detail(staff)},
            status=status.HTTP_200_OK,
        )


class GenericAdminStaffPermissionView(GenericAdminStaffBaseView):
    def post(self, request, staff_id):
        serializer = self.permission_serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        staff = self.get_staff(staff_id)
        staff = GenericStaffAdminService.sync_permissions(
            staff=staff,
            permission_model=self.permission_model,
            permission_relation_name=self.permission_relation_name,
            permission_codes=serializer.validated_data["permission_codes"],
            granted_by=request.user,
        )
        return Response(
            {self.staff_response_key: self.serialize_detail(staff)},
            status=status.HTTP_200_OK,
        )
