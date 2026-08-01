from rest_framework import status
from rest_framework.response import Response

from apps.staff.services.lawyer.lawyer_document_service import LawyerDocumentService
from apps.staff.views.lawyer.lawyer_base_view import LawyerBaseView


class LawyerDocumentsView(LawyerBaseView):
    def get(self, request):
        try:
            return Response(LawyerDocumentService.workspace(request.user, request.query_params))
        except Exception as exc:
            return Response({"detail": str(exc)}, status=getattr(exc, "status_code", status.HTTP_403_FORBIDDEN))

    def post(self, request):
        try:
            action = request.data.get("action")
            if action == "request":
                result = LawyerDocumentService.create_request(request.user, request.data)
            elif action == "reference":
                result = LawyerDocumentService.reference_document(request.user, request.data)
            else:
                return Response({"detail": "Document uploads are disabled. Use action=request or action=reference."}, status=400)
            return Response(result, status=status.HTTP_201_CREATED)
        except Exception as exc:
            return Response({"detail": getattr(exc, "detail", str(exc))}, status=getattr(exc, "status_code", 400))


class LawyerDocumentRequestReviewView(LawyerBaseView):
    def patch(self, request, request_id):
        try:
            return Response(LawyerDocumentService.review_request(request.user, request_id, request.data))
        except Exception as exc:
            return Response({"detail": getattr(exc, "detail", str(exc))}, status=getattr(exc, "status_code", 400))
