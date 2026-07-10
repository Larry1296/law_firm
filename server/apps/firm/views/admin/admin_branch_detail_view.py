from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.firm.serializers.branch_serializer import (
    BranchSerializer,
    BranchWriteSerializer,
)
from apps.firm.views.admin.admin_firm_base_view import AdminFirmBaseView


class AdminBranchDetailView(AdminFirmBaseView):
    def get_branch(self, branch_id):
        firm = self.get_firm()
        return get_object_or_404(
            firm.branches.select_related("branch_leader"),
            id=branch_id,
        )

    def patch(self, request, branch_id):
        branch = self.get_branch(branch_id)
        serializer = BranchWriteSerializer(
            branch,
            data=request.data,
            partial=True,
            context={"firm": branch.firm},
        )
        serializer.is_valid(raise_exception=True)

        name = serializer.validated_data.get("name")
        if name and branch.firm.branches.filter(
            name__iexact=name,
        ).exclude(id=branch.id).exists():
            raise ValidationError({"name": "A branch with this name already exists."})

        serializer.save()

        return Response(BranchSerializer(branch).data)

    def delete(self, request, branch_id):
        branch = self.get_branch(branch_id)
        branch.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)
