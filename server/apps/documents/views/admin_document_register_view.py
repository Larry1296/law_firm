from django.db.models import Q
from rest_framework.response import Response

from apps.clients.models import ClientDocument
from apps.documents.models import DocumentRequest
from apps.documents.services.workflow_service import DocumentWorkflowService
from apps.firm.views.admin.admin_firm_base_view import AdminFirmBaseView


class AdminDocumentRegisterView(AdminFirmBaseView):
    """Firm-wide register of client documents and outstanding document requests."""

    def get(self, request):
        firm = self.get_firm()
        query = (request.query_params.get("q") or "").strip()
        documents = (
            ClientDocument.objects.filter(client__firm=firm, archived_at__isnull=True)
            .select_related("client", "uploaded_by")
            .prefetch_related("matter_references__case")
        )
        if request.query_params.get("client_id"):
            documents = documents.filter(client_id=request.query_params["client_id"])
        if query:
            documents = documents.filter(
                Q(title__icontains=query) | Q(reference__icontains=query) | Q(file_name__icontains=query)
                | Q(client__full_name__icontains=query) | Q(description__icontains=query)
            )
        open_requests = (
            DocumentRequest.objects.filter(firm=firm)
            .exclude(status__in=[DocumentRequest.Status.ACCEPTED, DocumentRequest.Status.CANCELLED])
            .select_related("case", "client", "fulfilled_document", "secretary_verified_by", "dispatched_by")
            .order_by("due_date", "created_at")
        )
        return Response({
            "documents": [
                DocumentWorkflowService.serialize_document(item)
                for item in documents.order_by("-created_at").distinct()[:300]
            ],
            "open_requests": [DocumentWorkflowService.serialize_request(item) for item in open_requests[:300]],
            "totals": {
                "documents": documents.distinct().count(),
                "awaiting_client": open_requests.filter(status__in=["OPEN", "REPLACEMENT_REQUIRED"]).count(),
                "awaiting_secretary": open_requests.filter(status__in=["AWAITING_SECRETARY_DISPATCH", "PENDING_SECRETARY"]).count(),
                "awaiting_advocate": open_requests.filter(status="UPLOADED").count(),
            },
        })
