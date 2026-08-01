from django.db.models import Q
from django.http import FileResponse, Http404
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.clients.models import ClientDocument


class DocumentDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, document_id):
        user = request.user
        queryset = ClientDocument.objects.all()
        client = getattr(user, "client_profile", None)
        lawyer = getattr(user, "lawyer_profile", None)
        secretary = getattr(user, "secretary_profile", None)
        if client:
            queryset = queryset.filter(client=client, is_client_visible=True)
        elif lawyer:
            queryset = queryset.filter(client__cases__assigned_lawyer=lawyer)
        elif secretary and secretary.is_active:
            lawyer_ids = secretary.assigned_lawyers.values_list("id", flat=True)
            queryset = queryset.filter(
                Q(client__cases__assigned_secretary=secretary)
                | Q(client__cases__assigned_lawyer_id__in=lawyer_ids)
            )
        elif getattr(user, "owned_firm", None):
            queryset = queryset.filter(firm=user.owned_firm)
        else:
            raise Http404
        try:
            document = queryset.distinct().get(id=document_id)
        except ClientDocument.DoesNotExist as exc:
            raise Http404 from exc
        if not document.file:
            raise Http404
        response = FileResponse(document.file.open("rb"), content_type=document.mime_type or "application/octet-stream")
        response["Content-Disposition"] = f'inline; filename="{document.file_name}"'
        response["X-Content-Type-Options"] = "nosniff"
        response["Cache-Control"] = "private, no-store"
        return response
