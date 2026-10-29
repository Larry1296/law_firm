from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.cases.models import Case
from apps.clients.models import ClientDocument
from apps.clients.models import ClientMatterConflictCheck
from apps.common.choices import ConflictCheckStatus
from apps.documents.models import DocumentRequest, MatterDocumentReference
from apps.firm.services.records_room_service import RecordsRoomService
from apps.notifications.services import NotificationService
from apps.staff.models import Secretary


class DocumentWorkflowService:
    ALLOWED_TYPES = {choice for choice, _ in ClientDocument._meta.get_field("document_type").choices}

    @staticmethod
    def register_in_kyc_drawer(*, client, case, user, title, document_type, description=""):
        if document_type in {"CONTRACT", "FINANCIAL", "EVIDENCE", "LEGAL"}:
            raise ValidationError({
                "document_type": "Matter evidence and transactional records must not be registered in the client KYC drawer."
            })
        document = ClientDocument.objects.create(
            client=client, firm=client.firm,
            document_type=document_type,
            title=title,
            description=description,
            file="",
            uploaded_by=None,
            is_confidential=True,
            physical_copy_retained=False,
            physical_storage_location="",
            classification=ClientDocument.Classification.CLIENT_KYC,
        )
        document.physical_storage_location = f"KYC DRAWER / {client.kyc_drawer_reference}"
        document.save(update_fields=["physical_storage_location", "updated_at"])
        if case:
            MatterDocumentReference.objects.get_or_create(
                case=case,
                document=document,
                defaults={"purpose": MatterDocumentReference.Purpose.CLIENT_INSTRUCTION, "referenced_by": user},
            )
        return document

    @staticmethod
    def register_matter_document(*, client, case, user, title, document_type, description=""):
        """Evidence and transaction papers belong to the matter file, not the client's KYC drawer."""
        document = ClientDocument.objects.create(
            client=client, firm=client.firm,
            document_type=document_type,
            title=title,
            description=description,
            file="",
            uploaded_by=None,
            is_confidential=True,
            physical_copy_retained=False,
            physical_storage_location=f"MATTER FILE / {case.case_number}",
            classification=ClientDocument.Classification.MATTER_SPECIFIC,
            category=ClientDocument.Category.MATTER_EVIDENCE,
        )
        MatterDocumentReference.objects.get_or_create(
            case=case,
            document=document,
            defaults={"purpose": MatterDocumentReference.Purpose.EVIDENCE, "referenced_by": user},
        )
        return document

    @staticmethod
    def case_secretaries(case):
        filters = Q(pk__in=[])
        if case.assigned_secretary_id:
            filters |= Q(pk=case.assigned_secretary_id)
        if case.assigned_lawyer_id:
            filters |= Q(assigned_lawyers=case.assigned_lawyer)
        return Secretary.objects.select_related("user").filter(
            filters,
            law_firm=case.firm,
            is_active=True,
            user__is_active=True,
        ).distinct()

    @staticmethod
    def notify_secretaries_of_request(request, actor, *, replacement=False):
        title = "Replacement document requires dispatch" if replacement else "Advocate document request awaiting dispatch"
        for secretary in DocumentWorkflowService.case_secretaries(request.case):
            NotificationService.create(
                firm=request.firm,
                recipient=secretary.user,
                actor=actor,
                case=request.case,
                title=title,
                message=f'{request.case.assigned_lawyer.user.full_name} requires "{request.title}" for {request.case.case_number}.',
                action_url=f"/secretary/cases/{request.case_id}?section=documents",
                event_key=f"document-request-secretary-dispatch:{request.id}:{request.status}:{request.updated_at.isoformat()}",
            )

    MATTER_DOCUMENT_TYPES = {"CONTRACT", "FINANCIAL", "EVIDENCE", "LEGAL", "COURT_ORDER"}
    CLIENT_UPLOADABLE = {"OPEN", "REPLACEMENT_REQUIRED"}

    @staticmethod
    def create_request(*, user, case, data):
        """Anyone assigned to the matter may ask the client for a document; the client is told at once."""
        title = (data.get("title") or "").strip()
        if not title:
            raise ValidationError({"title": "Describe the document required from the client."})
        document_type = data.get("document_type") or "OTHER"
        if document_type not in DocumentWorkflowService.ALLOWED_TYPES:
            raise ValidationError({"document_type": "Select a valid document type."})
        due_date = data.get("due_date") or None
        if isinstance(due_date, str):
            due_date = parse_date(due_date)
            if due_date is None:
                raise ValidationError({"due_date": "Use the date format YYYY-MM-DD."})
        item = DocumentRequest.objects.create(
            firm=case.firm, client=case.client, case=case, requested_by=user, title=title,
            document_type=document_type,
            instructions=(data.get("instructions") or "").strip(), due_date=due_date,
            status=DocumentRequest.Status.OPEN, dispatched_by=user, dispatched_at=timezone.now(),
        )
        DocumentWorkflowService.notify_client_of_request(item, user)
        # The matter secretary will receive and file the paper, so they are told the request went out.
        for secretary in DocumentWorkflowService.case_secretaries(case):
            if secretary.user_id == user.id:
                continue
            NotificationService.create(
                firm=case.firm, recipient=secretary.user, actor=user, case=case,
                title="Document requested from client",
                message=f'"{item.title}" was requested from {case.client.full_name} for {case.case_number}.',
                action_url=f"/secretary/cases/{case.id}?section=documents",
                event_key=f"document-request-secretary-info:{item.id}:{secretary.id}",
            )
        return item

    @staticmethod
    def notify_client_of_request(item, actor, *, replacement=False, reason=""):
        client_user = item.client.user
        if not client_user or not client_user.is_active:
            return
        due = f" by {item.due_date:%d %B %Y}" if item.due_date else ""
        if replacement:
            title = "Please provide a replacement document"
            message = f'"{item.title}" for {item.case.case_number} needs to be replaced{due}.'
            if reason:
                message += f" Reason: {reason}"
        else:
            title = "Document requested"
            message = f'Please provide "{item.title}" for {item.case.case_number}{due}. Tell us from your dashboard how you will deliver it.'
            if item.instructions:
                message += f" {item.instructions}"
        NotificationService.create(
            firm=item.firm, recipient=client_user, actor=actor, case=item.case,
            title=title, message=message,
            action_url=f"/client/documents?request={item.id}",
            event_key=f"document-request-client:{item.id}:{item.status}:{item.updated_at.isoformat()}",
        )

    @staticmethod
    def _case_for_client(client, case_id):
        if not case_id:
            return None
        try:
            return Case.objects.get(id=case_id, client=client, firm=client.firm)
        except Case.DoesNotExist as exc:
            raise ValidationError({"case_id": "This matter does not belong to the client."}) from exc

    DELIVERY_METHODS = {
        ClientDocument.ReceivedVia.IN_PERSON: "in person at the firm",
        ClientDocument.ReceivedVia.COURIER: "by courier",
        ClientDocument.ReceivedVia.OTHER: "another way",
    }
    NO_FILES = (
        "Sheria Master does not keep document files. Bring or send the paper document to the firm; "
        "it is filed and its reference is recorded here."
    )

    @staticmethod
    @transaction.atomic
    def record_delivery_notice(*, client, user, data):
        """The client tells the firm how and when a requested paper document is coming.

        No file is taken. Staff receive the paper, file it and record its
        reference and location (see SecretaryDocumentService.verify_client_upload).
        """
        if data.get("file"):
            raise ValidationError({"file": DocumentWorkflowService.NO_FILES})
        method = data.get("delivery_method") or ClientDocument.ReceivedVia.IN_PERSON
        if method not in DocumentWorkflowService.DELIVERY_METHODS:
            raise ValidationError({"delivery_method": "Choose how the document will reach the firm."})
        expected = data.get("expected_delivery_date") or None
        if isinstance(expected, str):
            expected = parse_date(expected)
            if expected is None:
                raise ValidationError({"expected_delivery_date": "Use the date format YYYY-MM-DD."})
        if expected and expected < timezone.localdate():
            raise ValidationError({"expected_delivery_date": "Choose today or a later date."})
        try:
            request = DocumentRequest.objects.select_for_update(of=("self",)).select_related("case").get(
                id=data.get("request_id"), client=client, firm=client.firm
            )
        except (DocumentRequest.DoesNotExist, ValueError, TypeError) as exc:
            raise ValidationError({"request_id": "Document request was not found."}) from exc
        if request.status not in DocumentWorkflowService.CLIENT_UPLOADABLE:
            raise ValidationError({"request_id": "This request is not waiting for a document from you."})
        case, document_type = request.case, request.document_type

        # A replacement is a new record; the returned paper stays on record.
        register = (
            DocumentWorkflowService.register_matter_document
            if document_type in DocumentWorkflowService.MATTER_DOCUMENT_TYPES
            else DocumentWorkflowService.register_in_kyc_drawer
        )
        document = register(
            client=client, case=case, user=user, title=request.title, document_type=document_type,
            description=(data.get("note") or "").strip(),
        )
        when = f" on {expected:%d %B %Y}" if expected else ""
        document.is_client_visible = True
        document.received_via = method
        document.source_copy_type = ClientDocument.SourceCopyType.CLIENT_COPY
        document.custody_notes = f"Client will deliver it {DocumentWorkflowService.DELIVERY_METHODS[method]}{when}."
        document.uploaded_by = user
        document.save(update_fields=["is_client_visible", "received_via", "source_copy_type", "custody_notes", "uploaded_by", "updated_at"])

        request.fulfilled_document = document
        request.fulfilled_by = user
        request.fulfilled_at = timezone.now()
        request.status = DocumentRequest.Status.PENDING_SECRETARY
        request.save(update_fields=["fulfilled_document", "fulfilled_by", "fulfilled_at", "status", "updated_at"])
        DocumentWorkflowService._notify_secretary_of_client_upload(request, user, method=method, expected=expected)
        return document

    @staticmethod
    def _notify_secretary_of_client_upload(request, actor, *, method=None, expected=None):
        how = DocumentWorkflowService.DELIVERY_METHODS.get(method, "to the firm")
        when = f" on {expected:%d %B %Y}" if expected else ""
        for secretary in DocumentWorkflowService.case_secretaries(request.case):
            NotificationService.create(
                firm=request.firm, recipient=secretary.user, actor=actor, case=request.case,
                title="Client document on its way",
                message=f'{request.client.full_name} will deliver "{request.title}" for {request.case.case_number} {how}{when}. Receive and file it when it arrives.',
                action_url=f"/secretary/cases/{request.case_id}?section=documents",
                event_key=f"document-request-secretary-review:{request.id}:{request.fulfilled_document_id}:{secretary.id}",
            )

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
            title="Requested physical document received",
            message=f'{request.client.full_name} delivered "{request.title}" into {request.client.kyc_drawer_reference} for {request.case.case_number}.',
            action_url=f"/lawyer/cases/{request.case_id}?section=documents",
            event_key=f"document-request-uploaded:{request.id}:{request.fulfilled_document_id}",
        )

    @staticmethod
    def serialize_for_client(document):
        """What a client sees: the reference and where their paper stands, not the cabinet position."""
        return {
            "id": str(document.id), "reference": document.reference or None, "title": document.title,
            "document_type": document.document_type, "document_type_label": document.get_document_type_display(),
            "description": document.description,
            "review_status": document.review_status, "review_notes": document.review_notes,
            "where": RecordsRoomService.where_is(document, include_position=False),
            "received_at": document.received_at.isoformat() if document.received_at else None,
            "return_required": document.return_required,
            "expected_return_date": document.expected_return_date,
            "uploaded_at": document.created_at.isoformat(),
            "matters": [{"id": str(ref.case_id), "case_number": ref.case.case_number, "title": ref.case.title}
                        for ref in document.matter_references.all()],
        }

    @staticmethod
    def serialize_receipt(receipt):
        """A delivery receipt as issued, with the firm details frozen on it for the printed copy."""
        from apps.authentication.services.auth_service import AuthService

        current = AuthService.firm_payload(receipt.firm)
        firm = {"name": current["name"], **(current["contact"] or {})}
        firm.update({key: value for key, value in (receipt.firm_details_snapshot or {}).items() if value})
        return {
            "id": str(receipt.id), "receipt_number": receipt.receipt_number,
            "client_name": receipt.client.full_name, "kyc_reference": receipt.kyc_reference_snapshot,
            "received_from": receipt.received_from, "received_by": receipt.received_by.full_name,
            "received_at": receipt.received_at, "firm": firm,
            "documents": [{
                "reference": line.document_reference_snapshot, "title": line.title_snapshot,
                "copy_type": line.copy_type_snapshot, "page_count": line.page_count_snapshot,
                "condition": line.condition_snapshot, "return_required": line.return_required_snapshot,
            } for line in receipt.items.all()],
        }

    @staticmethod
    def serialize_document(document):
        references = list(document.matter_references.all())
        return {
            "where": RecordsRoomService.where_is(document),
            "held_in_id": str(document.held_in_id) if document.held_in_id else None,
            "id": str(document.id), "reference": document.reference, "title": document.title,
            "client_id": str(document.client_id), "client_name": document.client.full_name,
            "file_name": document.file_name,
            "file_url": f"/api/documents/{document.id}/download/" if document.file else "",
            "document_type": document.document_type, "document_type_label": document.get_document_type_display(),
            "description": document.description, "mime_type": document.mime_type,
            "review_status": document.review_status, "review_notes": document.review_notes,
            "source_reference": document.source_reference,
            "classification": document.classification,
            "classification_label": document.get_classification_display(),
            "temporary_intake_reference": document.temporary_intake_reference,
            "category": document.category,
            "category_label": document.get_category_display(),
            "subtype": document.subtype,
            "subtype_label": document.get_subtype_display(),
            "document_identifier": document.document_identifier,
            "document_owner_subject": document.document_owner_subject,
            "issuing_authority": document.issuing_authority,
            "document_date": document.document_date,
            "issue_date": document.issue_date,
            "expiry_date": document.expiry_date,
            "drawer_reference": document.client.kyc_drawer_reference,
            "digital_copy_reference": document.reference,
            "digital_copy_available": bool(document.file),
            "record_authority": "PHYSICAL_KYC_DRAWER" if document.classification == "CLIENT_KYC" else "PENDING_DESTINATION_REVIEW",
            "source_copy_type": document.source_copy_type,
            "source_copy_type_label": document.get_source_copy_type_display(),
            "physical_copy_retained": document.physical_copy_retained,
            "page_count": document.page_count,
            "return_required": document.return_required,
            "expected_return_date": document.expected_return_date,
            "visible_damage_or_alteration": document.visible_damage_or_alteration,
            "condition_description": document.condition_description,
            "confidentiality_level": document.confidentiality_level,
            "verification_status": document.verification_status,
            "verification_method": document.verification_method,
            "physical_storage_location": document.physical_storage_location,
            "custody_notes": document.custody_notes,
            "received_via": document.received_via,
            "received_from": document.received_from,
            "received_by": document.received_by.full_name if document.received_by else "Not recorded",
            "received_at": document.received_at.isoformat() if document.received_at else None,
            "uploaded_at": document.created_at.isoformat(),
            "uploaded_by": document.uploaded_by.full_name if document.uploaded_by else "Unknown",
            "receipt_number": document.receipt_items.select_related("receipt").first().receipt.receipt_number
                              if document.receipt_items.exists() else None,
            "matters": [{"id": str(ref.case_id), "case_number": ref.case.case_number,
                         "title": ref.case.title, "purpose": ref.purpose} for ref in references],
        }

    @staticmethod
    def serialize_request(item, *, for_client=False):
        result = {
            "id": str(item.id), "title": item.title, "document_type": item.document_type,
            "instructions": item.instructions, "due_date": item.due_date, "status": item.status,
            "case_id": str(item.case_id), "case_number": item.case.case_number,
            "case_title": item.case.title, "client_id": str(item.client_id),
            "client_name": item.client.full_name,
            "fulfilled_document_id": str(item.fulfilled_document_id) if item.fulfilled_document_id else None,
            "review_notes": item.fulfilled_document.review_notes if item.fulfilled_document_id else "",
            "drawer_reference": item.client.kyc_drawer_reference,
            "physical_storage_location": item.fulfilled_document.physical_storage_location if item.fulfilled_document_id else f"KYC DRAWER / {item.client.kyc_drawer_reference}",
            "digital_copy_available": bool(item.fulfilled_document.file) if item.fulfilled_document_id else False,
            "secretary_verified_by": item.secretary_verified_by.full_name if item.secretary_verified_by else None,
            "secretary_verified_at": item.secretary_verified_at.isoformat() if item.secretary_verified_at else None,
            "secretary_verification_notes": item.secretary_verification_notes,
            "dispatched_by": item.dispatched_by.full_name if item.dispatched_by else None,
            "dispatched_at": item.dispatched_at.isoformat() if item.dispatched_at else None,
            "dispatch_message": item.dispatch_message,
            "created_at": item.created_at.isoformat(),
            "delivery_note": item.fulfilled_document.custody_notes if item.fulfilled_document_id else "",
            "reference": item.fulfilled_document.reference if item.fulfilled_document_id else None,
        }
        if for_client:
            # The cabinet and drawer position is internal to the firm.
            result.pop("physical_storage_location")
            result["where"] = RecordsRoomService.where_is(item.fulfilled_document, include_position=False) if item.fulfilled_document_id else None
        return result

    @staticmethod
    def documents_for_client(client, *, query="", case_id=None):
        qs = ClientDocument.objects.filter(client=client, archived_at__isnull=True).select_related("client", "uploaded_by").prefetch_related("matter_references__case")
        if query:
            qs = qs.filter(
                Q(title__icontains=query) | Q(reference__icontains=query) | Q(file_name__icontains=query)
                | Q(subtype__icontains=query) | Q(document_identifier__icontains=query)
                | Q(description__icontains=query)
            )
        if case_id:
            qs = qs.filter(matter_references__case_id=case_id)
        return qs.order_by("-created_at").distinct()

    @staticmethod
    def requests_for_client(client, *, case_id=None, include_undispatched=False):
        qs = DocumentRequest.objects.filter(client=client)
        if not include_undispatched:
            qs = qs.exclude(status=DocumentRequest.Status.AWAITING_SECRETARY_DISPATCH)
        qs = qs.select_related("case", "client", "fulfilled_document", "secretary_verified_by", "dispatched_by")
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
        docs = ClientDocument.objects.filter(client_id__in=client_ids, archived_at__isnull=True).select_related("client", "uploaded_by").prefetch_related("matter_references__case")
        if query:
            docs = docs.filter(
                Q(title__icontains=query) | Q(reference__icontains=query) | Q(file_name__icontains=query)
                | Q(subtype__icontains=query) | Q(document_identifier__icontains=query)
                | Q(description__icontains=query)
            )
        requests = DocumentRequest.objects.filter(case__in=cases).select_related("case", "client", "fulfilled_document", "secretary_verified_by", "dispatched_by")
        return docs.order_by("-created_at").distinct(), requests
