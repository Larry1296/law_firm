from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.firm.models import Branch
from apps.firm.serializers.branch_serializer import (
    BranchSerializer,
    BranchWriteSerializer,
)
from apps.firm.views.admin.admin_firm_base_view import AdminFirmBaseView


class AdminBranchListView(AdminFirmBaseView):
    def get(self, request):
        firm = self.get_firm()
        branches = firm.branches.select_related("branch_leader")
        serializer = BranchSerializer(branches, many=True)
        return Response({"branches": serializer.data})

    def post(self, request):
        firm = self.get_firm()
        serializer = BranchWriteSerializer(
            data=request.data,
            context={"firm": firm},
        )
        serializer.is_valid(raise_exception=True)

        if firm.branches.filter(
            name__iexact=serializer.validated_data["name"],
        ).exists():
            raise ValidationError({"name": "A branch with this name already exists."})

        branch = Branch.objects.create(
            firm=firm,
            branch_leader=serializer.validated_data.pop("branch_leader"),
            **serializer.validated_data,
        )

        return Response(
            BranchSerializer(branch).data,
            status=status.HTTP_201_CREATED,
        )
