from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError

from apps.firm.models import Department
from apps.firm.serializers.department_serializer import (
    DepartmentSerializer,
    DepartmentWriteSerializer,
)
from apps.firm.views.admin.admin_firm_base_view import AdminFirmBaseView


class AdminDepartmentListView(AdminFirmBaseView):
    def get(self, request):
        firm = self.get_firm()
        departments = firm.departments.select_related("branch")
        serializer = DepartmentSerializer(departments, many=True)
        return Response({"departments": serializer.data})

    def post(self, request):
        firm = self.get_firm()
        serializer = DepartmentWriteSerializer(data=request.data, context={"firm": firm})
        serializer.is_valid(raise_exception=True)

        if firm.departments.filter(
            name__iexact=serializer.validated_data["name"],
        ).exists():
            raise ValidationError({
                "name": "A department with this name already exists."
            })

        department = Department.objects.create(
            firm=firm,
            **serializer.validated_data,
        )

        return Response(
            DepartmentSerializer(department).data,
            status=status.HTTP_201_CREATED,
        )
