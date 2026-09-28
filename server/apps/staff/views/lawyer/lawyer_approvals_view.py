from rest_framework import status
from rest_framework.response import Response

from apps.staff.services.lawyer.lawyer_approval_service import LawyerApprovalService
from apps.staff.views.lawyer.lawyer_base_view import LawyerBaseView


class LawyerApprovalsView(LawyerBaseView):
    def get(self, request):
        try:
            approvals = LawyerApprovalService.list_approvals(request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        return Response({"approvals": approvals}, status=status.HTTP_200_OK)
