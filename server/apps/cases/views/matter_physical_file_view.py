from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cases.services import CaseService, MatterPhysicalFileService


class MatterPhysicalFileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, case_id):
        try:
            case = CaseService.get_case(request.user, case_id)
            physical_file = MatterPhysicalFileService.ensure_pending(case, request.user)
            return Response({"physical_file": MatterPhysicalFileService.serialize(physical_file)})
        except Exception as exc:
            return Response({"detail": getattr(exc, "detail", str(exc))}, status=getattr(exc, "status_code", 400))

    def post(self, request, case_id):
        try:
            case = CaseService.get_case(request.user, case_id)
            operation = request.data.get("operation")
            if operation == "assign":
                physical_file = MatterPhysicalFileService.assign(request.user, case, request.data)
            elif operation == "move":
                physical_file = MatterPhysicalFileService.move(request.user, case, request.data)
            elif operation == "transfer_document":
                attachment = MatterPhysicalFileService.transfer_client_document(
                    request.user, case, request.data.get("document_id"), request.data
                )
                return Response({"document_reference": attachment.document_reference}, status=status.HTTP_201_CREATED)
            elif operation == "request_retrieval":
                task = MatterPhysicalFileService.request_retrieval(request.user, case, request.data)
                return Response({"task_id": str(task.id), "detail": "Retrieval request recorded."}, status=status.HTTP_201_CREATED)
            else:
                return Response({"operation": "Select assign, move or transfer_document."}, status=400)
            return Response({"physical_file": MatterPhysicalFileService.serialize(physical_file)})
        except Exception as exc:
            return Response({"detail": getattr(exc, "detail", str(exc))}, status=getattr(exc, "status_code", 400))
