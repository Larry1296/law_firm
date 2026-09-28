from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.firm.models import Branch
from apps.firm.serializers.branch_serializer import (
    BranchSerializer,
    BranchWriteSerializer,
)
from apps.firm.views.admin.admin_firm_base_view import AdminFirmBaseView
from apps.subscriptions.catalog import Limit
from apps.subscriptions.services import SubscriptionService


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

        if serializer.validated_data.get("is_active", True):
            SubscriptionService.check_limit(firm, Limit.BRANCHES)
        branch = Branch.objects.create(
            firm=firm,
            branch_leader=serializer.validated_data.pop("branch_leader", None) or firm.owner,
            **serializer.validated_data,
        )

        return Response(
            BranchSerializer(branch).data,
            status=status.HTTP_201_CREATED,
        )
