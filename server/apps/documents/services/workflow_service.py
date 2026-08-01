from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.cases.models import Case
from apps.clients.models import ClientDocument, ClientKycFolder
from apps.documents.models import DocumentRequest, MatterDocumentReference
from apps.notifications.services import NotificationService


class DocumentWorkflowService:

    @staticmethod
    def _firm_for_user(user):
        """Resolve the user's firm via CaseService."""
        from apps.cases.services.case_service import CaseService
        return CaseService.get_user_firm(user)
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
    def _resolve_or_create_kyc_folder(client, actor, kyc_folder_id=None):
        """Return the KYC folder to file this document under.

        If *kyc_folder_id* is provided, look it up.  Otherwise, find the
        client's most recent **open** folder.  If none exists, create a new
        one with the next sequential reference for the firm
        (e.g. ``KYC-2026-039``).
        """
        if kyc_folder_id:
            try:
                return ClientKycFolder.objects.select_for_update().get(
                    id=kyc_folder_id, client=client, firm=client.firm
                )
            except ClientKycFolder.DoesNotExist:
                raise ValidationError({"kyc_folder_id": "KYC folder was not found for this client."})

        # Re-use the client's latest open folder, if any.
        folder = (
            ClientKycFolder.objects.filter(client=client, firm=client.firm, status=ClientKycFolder.Status.OPEN)
            .order_by("-opened_at")
            .first()
        )
        if folder:
            # Lock it for the index allocation.
            return ClientKycFolder.objects.select_for_update().get(id=folder.id)

        # Create a new KYC folder with the next sequential reference.
        year = timezone.now().year
        prefix = f"KYC-{year}-"
        latest = (
            ClientKycFolder.objects.filter(firm=client.firm, reference__startswith=prefix)
            .order_by("-reference")
            .first()
        )
        next_number = 1
        if latest:
            try:
                next_number = int(latest.reference.rsplit("-", 1)[1]) + 1
            except (IndexError, ValueError):
                next_number = (
                    ClientKycFolder.objects.filter(firm=client.firm, reference__startswith=prefix).count() + 1
                )
        reference = f"{prefix}{next_number:03d}"

        return ClientKycFolder.objects.create(
            firm=client.firm,
            client=client,
            reference=reference,
            opened_by=actor,
        )

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

        # ── Resolve the KYC folder and allocate the document index ────
        kyc_folder_id = data.get("kyc_folder_id")
        kyc_folder = DocumentWorkflowService._resolve_or_create_kyc_folder(client, user, kyc_folder_id)
        document_index = kyc_folder.allocate_document_index()
        full_reference = f"{kyc_folder.reference}/D{document_index}"

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
            kyc_folder=kyc_folder,
            document_index=document_index,
            document_type=document_type,
            title=(data.get("title") or upload.name).strip(),
            description=(data.get("description") or "").strip(),
            file=upload,
            file_name=upload.name,
            mime_type=getattr(upload, "content_type", "") or "application/octet-stream",
            uploaded_by=user,
            is_confidential=True,
            reference=full_reference,
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
                purpose=data.get("purpose") or MatterDocumentReference.Purpose.KYC_DOCUMENT,
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
            "id": str(document.id),
            "reference": document.full_reference,
            "kyc_folder": document.kyc_folder.reference if document.kyc_folder_id else None,
            "document_index": document.document_index,
            "title": document.title,
            "client_id": str(document.client_id),
            "client_name": document.client.full_name,
            "file_name": document.file_name,
            "file_url": f"/api/documents/{document.id}/download/" if document.file else "",
            "document_type": document.document_type,
            "document_type_label": document.get_document_type_display(),
            "description": document.description,
            "mime_type": document.mime_type,
            "review_status": document.review_status,
            "review_notes": document.review_notes,
            "source_reference": document.source_reference,
            "source_copy_type": document.source_copy_type,
            "physical_copy_retained": document.physical_copy_retained,
            "physical_storage_location": document.physical_storage_location,
            "custody_notes": document.custody_notes,
            "uploaded_at": document.created_at.isoformat(),
            "uploaded_by": document.uploaded_by.full_name if document.uploaded_by else "Unknown",
            "matters": [
                {
                    "id": str(ref.case_id),
                    "case_number": ref.case.case_number,
                    "title": ref.case.title,
                    "purpose": ref.purpose,
                    "purpose_label": ref.get_purpose_display(),
                }
                for ref in references
            ],
        }

    @staticmethod
    def serialize_kyc_folder(folder):
        docs = folder.documents.all().order_by("document_index")
        return {
            "id": str(folder.id),
            "reference": folder.reference,
            "client_id": str(folder.client_id),
            "client_name": folder.client.full_name,
            "status": folder.status,
            "opened_by": folder.opened_by.full_name if folder.opened_by else "Unknown",
            "opened_at": folder.opened_at.isoformat(),
            "closed_at": folder.closed_at.isoformat() if folder.closed_at else None,
            "notes": folder.notes,
            "document_count": folder.document_count,
            "documents": [
                {
                    "id": str(doc.id),
                    "reference": doc.full_reference,
                    "document_index": doc.document_index,
                    "title": doc.title,
                    "document_type": doc.document_type,
                    "document_type_label": doc.get_document_type_display(),
                    "description": doc.description,
                    "physical_storage_location": doc.physical_storage_location,
                    "physical_copy_retained": doc.physical_copy_retained,
                    "review_status": doc.review_status,
                }
                for doc in docs
            ],
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
        qs = (
            ClientDocument.objects.filter(client=client)
            .select_related("client", "uploaded_by", "kyc_folder")
            .prefetch_related("matter_references__case")
        )
        if query:
            qs = qs.filter(
                Q(title__icontains=query)
                | Q(reference__icontains=query)
                | Q(file_name__icontains=query)
            )
        if case_id:
            qs = qs.filter(matter_references__case_id=case_id)
        return qs.order_by("-created_at").distinct()

    @staticmethod
    def kyc_folders_for_client(client):
        return (
            ClientKycFolder.objects.filter(client=client, firm=client.firm)
            .select_related("client", "opened_by")
            .prefetch_related("documents")
            .order_by("-opened_at")
        )

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
        docs = (
            ClientDocument.objects.filter(client_id__in=client_ids)
            .select_related("client", "uploaded_by", "kyc_folder")
            .prefetch_related("matter_references__case")
        )
        if query:
            docs = docs.filter(
                Q(title__icontains=query) | Q(reference__icontains=query) | Q(file_name__icontains=query)
            )
        requests = DocumentRequest.objects.filter(case__in=cases).select_related("case", "client", "fulfilled_document")
        return docs.order_by("-created_at").distinct(), requests
