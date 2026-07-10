from rest_framework import status
from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from rest_framework.response import Response

from apps.firm.serializers.department_serializer import (
    DepartmentSerializer,
    DepartmentWriteSerializer,
)
from apps.firm.views.admin.admin_firm_base_view import AdminFirmBaseView


class AdminDepartmentDetailView(AdminFirmBaseView):
    def get_department(self, department_id):
        firm = self.get_firm()
        return get_object_or_404(
            firm.departments.select_related("branch"),
            id=department_id,
        )

    def patch(self, request, department_id):
        department = self.get_department(department_id)
        serializer = DepartmentWriteSerializer(
            department,
            data=request.data,
            partial=True,
            context={"firm": department.firm},
        )
        serializer.is_valid(raise_exception=True)

        name = serializer.validated_data.get("name")
        if name and department.firm.departments.filter(
            name__iexact=name,
        ).exclude(id=department.id).exists():
            raise ValidationError({
                "name": "A department with this name already exists."
            })

        serializer.save()

        return Response(DepartmentSerializer(department).data)

    def delete(self, request, department_id):
        department = self.get_department(department_id)
        department.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)
