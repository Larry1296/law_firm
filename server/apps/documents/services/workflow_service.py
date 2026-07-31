from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.cases.models import Case
from apps.clients.models import ClientDocument
from apps.documents.models import DocumentRequest, MatterDocumentReference
from apps.notifications.services import NotificationService


class DocumentWorkflowService:
    ALLOWED_TYPES = {choice for choice, _ in ClientDocument._meta.get_field("document_type").choices}
    MAX_FILE_SIZE = 25 * 1024 * 1024

    @staticmethod
    def _validate_file(upload):
        if upload is None:
            raise ValidationError({"file": "Choose a document to upload."})
        if upload.size > DocumentWorkflowService.MAX_FILE_SIZE:
            raise ValidationError({"file": "Documents must not exceed 25 MB."})
        extension = upload.name.rsplit(".", 1)[-1].lower() if "." in upload.name else ""
        if extension not in {"pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png", "txt"}:
            raise ValidationError({"file": "Use PDF, Office document, image, or text file formats."})

    @staticmethod
    def _case_for_client(client, case_id):
        if not case_id:
            return None
        try:
            return Case.objects.get(id=case_id, client=client, firm=client.firm)
        except Case.DoesNotExist as exc:
            raise ValidationError({"case_id": "This matter does not belong to the client."}) from exc

    @staticmethod
    @transaction.atomic
    def upload(*, client, user, data):
        upload = data.get("file")
        DocumentWorkflowService._validate_file(upload)
        document_type = data.get("document_type", "OTHER")
        if document_type not in DocumentWorkflowService.ALLOWED_TYPES:
            raise ValidationError({"document_type": "Select a valid document type."})
        source_copy_type = data.get("source_copy_type") or ClientDocument.SourceCopyType.CLIENT_COPY
        if source_copy_type not in ClientDocument.SourceCopyType.values:
            raise ValidationError({"source_copy_type": "Select a valid source-copy type."})
        physical_retained = str(data.get("physical_copy_retained", "")).lower() in {"true", "1", "yes", "on"}
        physical_location = (data.get("physical_storage_location") or "").strip()
        if physical_retained and not physical_location:
            raise ValidationError({"physical_storage_location": "Record where the physical KYC document is held."})
        case = DocumentWorkflowService._case_for_client(client, data.get("case_id"))
        request = None
        request_id = data.get("request_id")
        if request_id:
            try:
                request = DocumentRequest.objects.select_for_update().get(
                    id=request_id, client=client, firm=client.firm
                )
            except DocumentRequest.DoesNotExist as exc:
                raise ValidationError({"request_id": "Document request was not found."}) from exc
            if request.status in {DocumentRequest.Status.ACCEPTED, DocumentRequest.Status.CANCELLED}:
                raise ValidationError({"request_id": "This document request is already closed."})
            case = request.case
            document_type = request.document_type

        document = ClientDocument.objects.create(
            client=client,
            document_type=document_type,
            title=(data.get("title") or upload.name).strip(),
            description=(data.get("description") or "").strip(),
            file=upload,
            file_name=upload.name,
            mime_type=getattr(upload, "content_type", "") or "application/octet-stream",
            uploaded_by=user,
            is_confidential=True,
            source_reference=(data.get("source_reference") or "").strip(),
            source_copy_type=source_copy_type,
            physical_copy_retained=physical_retained,
            physical_storage_location=physical_location,
            custody_notes=(data.get("custody_notes") or "").strip(),
        )
        if case:
            MatterDocumentReference.objects.create(
                case=case,
                document=document,
                purpose=data.get("purpose") or MatterDocumentReference.Purpose.CLIENT_INSTRUCTION,
                notes=(data.get("reference_notes") or "").strip(),
                referenced_by=user,
            )
        if request:
            request.fulfilled_document = document
            request.fulfilled_by = user
            request.fulfilled_at = timezone.now()
            request.status = DocumentRequest.Status.UPLOADED
            request.save(update_fields=["fulfilled_document", "fulfilled_by", "fulfilled_at", "status", "updated_at"])
            DocumentWorkflowService._notify_lawyer_of_upload(request, user)
        return document

    @staticmethod
    def _notify_lawyer_of_upload(request, actor):
        lawyer = request.case.assigned_lawyer
        if not lawyer or not lawyer.user_id:
            return
        NotificationService.create(
            firm=request.firm,
            recipient=lawyer.user,
            actor=actor,
            case=request.case,
            title="Requested document uploaded",
            message=f'{request.client.full_name} supplied "{request.title}" for {request.case.case_number}.',
            action_url=f"/lawyer/cases/{request.case_id}?section=documents",
            event_key=f"document-request-uploaded:{request.id}:{request.fulfilled_document_id}",
        )

    @staticmethod
    def serialize_document(document):
        references = list(document.matter_references.all())
        return {
            "id": str(document.id), "reference": document.reference, "title": document.title,
            "client_id": str(document.client_id), "client_name": document.client.full_name,
            "file_name": document.file_name,
            "file_url": f"/api/documents/{document.id}/download/" if document.file else "",
            "document_type": document.document_type, "document_type_label": document.get_document_type_display(),
            "description": document.description, "mime_type": document.mime_type,
            "review_status": document.review_status, "review_notes": document.review_notes,
            "source_reference": document.source_reference,
            "source_copy_type": document.source_copy_type,
            "physical_copy_retained": document.physical_copy_retained,
            "uploaded_at": document.created_at.isoformat(),
            "uploaded_by": document.uploaded_by.full_name if document.uploaded_by else "Unknown",
            "matters": [{"id": str(ref.case_id), "case_number": ref.case.case_number,
                         "title": ref.case.title, "purpose": ref.purpose} for ref in references],
        }

    @staticmethod
    def serialize_request(item):
        return {
            "id": str(item.id), "title": item.title, "document_type": item.document_type,
            "instructions": item.instructions, "due_date": item.due_date, "status": item.status,
            "case_id": str(item.case_id), "case_number": item.case.case_number,
            "case_title": item.case.title, "client_id": str(item.client_id),
            "client_name": item.client.full_name,
            "fulfilled_document_id": str(item.fulfilled_document_id) if item.fulfilled_document_id else None,
            "created_at": item.created_at.isoformat(),
        }

    @staticmethod
    def documents_for_client(client, *, query="", case_id=None):
        qs = ClientDocument.objects.filter(client=client).select_related("client", "uploaded_by").prefetch_related("matter_references__case")
        if query:
            qs = qs.filter(Q(title__icontains=query) | Q(reference__icontains=query) | Q(file_name__icontains=query))
        if case_id:
            qs = qs.filter(matter_references__case_id=case_id)
        return qs.order_by("-created_at").distinct()

    @staticmethod
    def requests_for_client(client, *, case_id=None):
        qs = DocumentRequest.objects.filter(client=client).select_related("case", "client", "fulfilled_document")
        if case_id:
            qs = qs.filter(case_id=case_id)
        return qs

    @staticmethod
    def accessible_cases_for_lawyer(user):
        lawyer = getattr(user, "lawyer_profile", None)
        if not lawyer:
            raise PermissionDenied("Only advocates can access this document workspace.")
        return Case.objects.filter(firm=lawyer.law_firm, assigned_lawyer=lawyer, is_active=True)

    @staticmethod
    def accessible_cases_for_secretary(user):
        secretary = getattr(user, "secretary_profile", None)
        if not secretary or not secretary.is_active:
            raise PermissionDenied("Only active secretaries can access this document workspace.")
        lawyer_ids = secretary.assigned_lawyers.values_list("id", flat=True)
        return Case.objects.filter(firm=secretary.law_firm, is_active=True).filter(
            Q(assigned_secretary=secretary) | Q(assigned_lawyer_id__in=lawyer_ids)
        )

    @staticmethod
    def staff_workspace(cases, params):
        case_id, client_id, query = params.get("case_id"), params.get("client_id"), params.get("q", "").strip()
        if case_id:
            cases = cases.filter(id=case_id)
        if client_id:
            cases = cases.filter(client_id=client_id)
        client_ids = cases.values_list("client_id", flat=True)
        docs = ClientDocument.objects.filter(client_id__in=client_ids).select_related("client", "uploaded_by").prefetch_related("matter_references__case")
        if query:
            docs = docs.filter(Q(title__icontains=query) | Q(reference__icontains=query) | Q(file_name__icontains=query))
        requests = DocumentRequest.objects.filter(case__in=cases).select_related("case", "client", "fulfilled_document")
        return docs.order_by("-created_at").distinct(), requests
