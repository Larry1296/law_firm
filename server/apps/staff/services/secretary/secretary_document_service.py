import re

from rest_framework.exceptions import ValidationError
from django.db import IntegrityError, models, transaction
from django.utils import timezone
from django.utils.dateparse import parse_date

from apps.clients.models import Client
from apps.clients.models import (
    ClientDocument, ClientDocumentCustodyMovement,
    ClientDocumentReferenceCorrection, ClientDocumentReferenceSequence,
    ClientDocumentRegisterRemoval, ClientKYCReferenceHistory,
)
from apps.documents.models import (
    DocumentRequest, PhysicalDocumentReceipt, PhysicalDocumentReceiptItem,
    PhysicalDocumentReceiptSequence,
)
from apps.authentication.services.auth_service import AuthService
from apps.communications.services import ChatService
from apps.documents.services.workflow_service import DocumentWorkflowService
from apps.firm.models import StorageLocation
from apps.staff.models import Secretary
from apps.firm.services.records_room_service import RecordsRoomService, location_or_error
from apps.cases.models import Case, CaseAttachment, MatterPhysicalFile
from apps.cases.services.matter_physical_file_service import MatterPhysicalFileService


class SecretaryDocumentService:
    DRAWER_REFERENCE_PATTERN = re.compile(r"^KYC-\d{4}-\d{3,}$")
    DOCUMENT_REFERENCE_PATTERN = re.compile(r"^KYC-\d{4}-\d{3,}/[A-Z0-9][A-Z0-9._/-]{0,39}$")

    @staticmethod
    def records_keeper(user, refusal):
        """The firm whose physical client register this user keeps.

        Authorised records staff keep it. Where the firm has none (an advocate
        practising without a secretary), the advocate keeps their own clients'
        papers rather than leave them unrecorded, as at reception.
        """
        secretary = getattr(user, "secretary_profile", None)
        if secretary:
            if secretary.is_active and secretary.can_receive_documents:
                return secretary.law_firm
            raise ValidationError({"detail": refusal})
        lawyer = getattr(user, "lawyer_profile", None)
        if lawyer and lawyer.is_active and not SecretaryDocumentService.records_staff(lawyer.law_firm).exists():
            return lawyer.law_firm
        raise ValidationError({"detail": refusal})

    @staticmethod
    def records_staff(firm):
        return Secretary.objects.filter(
            law_firm=firm, is_active=True, user__is_active=True, can_receive_documents=True,
            employment_status__in=["ACTIVE", "PROBATION"],
        )

    @staticmethod
    def records_cases(user, firm):
        if getattr(user, "secretary_profile", None):
            return DocumentWorkflowService.accessible_cases_for_secretary(user)
        return Case.objects.filter(firm=firm, is_active=True, assigned_lawyer=user.lawyer_profile)

    @staticmethod
    def received_from_options(client):
        if client.client_type == Client.ClientType.INDIVIDUAL:
            return [{"value": "CLIENT", "label": client.full_name, "name": client.full_name}]

        today = timezone.localdate()
        representatives = client.representatives.exclude(authority_type="").filter(
            models.Q(authority_start_date__isnull=True) | models.Q(authority_start_date__lte=today),
            models.Q(authority_end_date__isnull=True) | models.Q(authority_end_date__gte=today),
        ).order_by("-is_primary", "-is_litigation_representative", "full_legal_name")
        options = [{
            "value": f"REP:{item.pk}",
            "label": (
                f"{item.full_legal_name}"
                f"{f' — {item.role_title}' if item.role_title else ''}"
                f" — {item.get_representative_category_display()}"
            ),
            "name": item.full_legal_name,
        } for item in representatives]
        # A preliminary representative recorded at intake may physically hand over the
        # very papers (resolution, ID) that later verify their authority. Recording who
        # delivered a document is a fact of receipt, not a grant of authority.
        unverified = client.representatives.exclude(pk__in=representatives.values("pk")).order_by("-is_primary", "full_legal_name")
        options += [{
            "value": f"REP:{item.pk}",
            "label": (
                f"{item.full_legal_name}"
                f"{f' — {item.role_title}' if item.role_title else ''}"
                " — authority not yet verified"
            ),
            "name": item.full_legal_name,
        } for item in unverified]
        if options:
            return options

        contacts = client.contacts.filter(
            is_verified=True,
            contact_type="LEGAL_REPRESENTATIVE",
        ).order_by("-is_primary", "full_name")
        return [{
            "value": f"CONTACT:{item.pk}",
            "label": f"{item.full_name}{f' — {item.role_or_designation}' if item.role_or_designation else ''}",
            "name": item.full_name,
        } for item in contacts if item.full_name]

    @staticmethod
    def resolve_received_from(client, selection):
        options = SecretaryDocumentService.received_from_options(client)
        selected = next((item for item in options if item["value"] == selection), None)
        if selected:
            return selected["name"]
        if not options:
            raise ValidationError({"received_from_contact": "Record an authorised representative with instruction authority for this organisation first."})
        raise ValidationError({"received_from_contact": "Select an authorised contact recorded for this client."})

    @staticmethod
    def resolve_document_subject(client, subtype, selection):
        personal_identity_types = {
            ClientDocument.Subtype.NATIONAL_ID,
            ClientDocument.Subtype.PASSPORT,
            ClientDocument.Subtype.ALIEN_ID,
        }
        if client.client_type == Client.ClientType.INDIVIDUAL or subtype not in personal_identity_types:
            return client.full_name
        options = SecretaryDocumentService.received_from_options(client)
        selected = next((item for item in options if item["value"] == selection), None)
        if not selected:
            raise ValidationError({
                "document_owner_contact": "Select the authorised representative whose identity document is being filed."
            })
        return selected["name"]

    @staticmethod
    @staticmethod
    @transaction.atomic
    def assign_kyc_drawer(user, data):
        firm = SecretaryDocumentService.records_keeper(user, "Only active secretaries can assign KYC drawers.")
        try:
            client = Client.objects.select_for_update().get(id=data.get("client_id"), firm=firm)
        except (Client.DoesNotExist, ValueError, TypeError) as exc:
            raise ValidationError({"client_id": "Select a client file."}) from exc
        if client.kyc_drawer_reference:
            raise ValidationError(
                {
                    "kyc_drawer_reference": (
                        "This client already has a permanent KYC drawer. "
                        "A second drawer cannot be assigned."
                    )
                }
            )
        # Left blank, the next number is generated (KYC-2026-040); a firm moving existing paper
        # files across may type the number already written on the folder.
        reference = (data.get("kyc_drawer_reference") or "").strip().upper()
        if not reference:
            reference = RecordsRoomService.allocate_kyc_reference(firm)
        elif not SecretaryDocumentService.DRAWER_REFERENCE_PATTERN.fullmatch(reference):
            raise ValidationError({"kyc_drawer_reference": "Use the physical drawer format KYC-2026-039."})
        if Client.objects.exclude(id=client.id).filter(firm=firm, kyc_drawer_reference=reference).exists():
            raise ValidationError({"kyc_drawer_reference": "This physical KYC drawer number is already assigned."})
        place = location_or_error(firm, data.get("location_id"), purposes=[StorageLocation.Purpose.KYC])
        cabinet_location = place.path if place else (data.get("cabinet_location") or "").strip()
        if not cabinet_location:
            raise ValidationError({"location_id": "Choose the drawer or shelf where this KYC file is kept."})
        reason = (data.get("reason") or "Initial physical KYC file assignment").strip()
        previous_reference = client.kyc_drawer_reference or ""
        previous_location = client.kyc_cabinet_location
        client.kyc_drawer_reference = reference
        client.kyc_cabinet_location = cabinet_location
        client.kyc_location = place
        client.kyc_reference_assigned_by = user
        client.kyc_reference_assigned_at = timezone.now()
        try:
            client.save(update_fields=["kyc_drawer_reference", "kyc_cabinet_location", "kyc_location", "kyc_reference_assigned_by", "kyc_reference_assigned_at", "updated_at"])
        except IntegrityError as exc:
            raise ValidationError({"kyc_drawer_reference": "This physical KYC file reference is already assigned in this firm."}) from exc
        ClientKYCReferenceHistory.objects.create(
            client=client, previous_reference=previous_reference, new_reference=reference,
            previous_cabinet_location=previous_location, new_cabinet_location=cabinet_location,
            reason=reason, changed_by=user,
        )
        return {
            "client_id": str(client.id), "kyc_drawer_reference": reference,
            "cabinet_location": cabinet_location, "location_id": str(place.id) if place else None,
        }

    @staticmethod
    def _next_document_reference(client):
        sequence, _ = ClientDocumentReferenceSequence.objects.get_or_create(client=client)
        sequence = ClientDocumentReferenceSequence.objects.select_for_update().get(client=client)
        while True:
            reference = f"{client.kyc_drawer_reference}/D{sequence.next_number}"
            sequence.next_number += 1
            sequence.save(update_fields=["next_number", "updated_at"])
            if not ClientDocument.objects.filter(firm=client.firm, reference=reference).exists():
                return reference

    @staticmethod
    @transaction.atomic
    def propose_document_reference(user, client_id):
        firm = SecretaryDocumentService.records_keeper(user, "Only active authorised records staff can propose references.")
        try:
            client = Client.objects.select_for_update().get(id=client_id, firm=firm)
        except Client.DoesNotExist as exc:
            raise ValidationError({"client_id": "Select a client file."}) from exc
        if not client.kyc_drawer_reference:
            raise ValidationError({"kyc_drawer_reference": "Assign the client's KYC file reference first."})
        sequence, _ = ClientDocumentReferenceSequence.objects.get_or_create(client=client)
        next_number = sequence.next_number
        while ClientDocument.objects.filter(
            firm=client.firm, reference=f"{client.kyc_drawer_reference}/D{next_number}"
        ).exists():
            next_number += 1
        # Preview only: allocation happens when an actual physical record is saved.
        return {"document_reference": f"{client.kyc_drawer_reference}/D{next_number}"}

    @staticmethod
    def create_request(user, data):
        secretary = getattr(user, "secretary_profile", None)
        cases = DocumentWorkflowService.accessible_cases_for_secretary(user)
        try:
            case = cases.select_related("client__user", "firm").get(id=data.get("case_id"))
        except Exception as exc:
            raise ValidationError({"case_id": "Select an accessible matter for this client."}) from exc
        item = DocumentWorkflowService.create_request(user=user, case=case, data=data)
        return DocumentWorkflowService.serialize_request(item)

    @staticmethod
    @transaction.atomic
    def dispatch_request(user, request_id, data):
        cases = DocumentWorkflowService.accessible_cases_for_secretary(user)
        try:
            item = DocumentRequest.objects.select_for_update().select_related("case", "client").get(
                id=request_id, case__in=cases
            )
        except DocumentRequest.DoesNotExist as exc:
            raise ValidationError({"request_id": "The document request is not accessible."}) from exc
        if item.status != DocumentRequest.Status.AWAITING_SECRETARY_DISPATCH:
            raise ValidationError({"status": "Only a request awaiting secretary dispatch can be sent."})
        if not ChatService.case_supports_client_chat(item.case):
            raise ValidationError({"client": "Enable this client's portal account before sending the request."})

        covering_message = (data.get("message") or "").strip()
        request_details = f'Please upload "{item.title}" for {item.case.case_number}'
        if item.due_date:
            request_details += f" by {item.due_date:%d %B %Y}"
        request_details += "."
        if item.instructions:
            request_details += f"\n\nInstructions: {item.instructions}"
        message = f"{covering_message}\n\n{request_details}".strip()

        thread = ChatService.get_or_create_case_thread(user=user, case_id=item.case_id)
        ChatService.send_message(user, thread, body=message)
        item.status = DocumentRequest.Status.OPEN
        item.dispatched_by = user
        item.dispatched_at = timezone.now()
        item.dispatch_message = covering_message
        item.save(update_fields=["status", "dispatched_by", "dispatched_at", "dispatch_message", "updated_at"])
        return DocumentWorkflowService.serialize_request(item)

    @staticmethod
    @transaction.atomic
    def verify_client_upload(user, request_id, data):
        """The paper the client said they would deliver has arrived: check it and file it.

        The system numbers it inside its file (KYC-2026-039/D4 or the matter's
        <case number>/D002) and records who received it. An original kept outside
        that file, such as a title deed in the safe, is placed with location_id.
        """
        from apps.cases.services.matter_physical_file_service import MatterPhysicalFileService

        cases = DocumentWorkflowService.accessible_cases_for_secretary(user)
        try:
            item = DocumentRequest.objects.select_for_update(of=("self",)).select_related(
                "fulfilled_document", "case__assigned_lawyer__user", "client", "secretary_verified_by"
            ).get(id=request_id, case__in=cases)
        except DocumentRequest.DoesNotExist as exc:
            raise ValidationError({"request_id": "The document request is not accessible."}) from exc
        if item.status != DocumentRequest.Status.PENDING_SECRETARY or not item.fulfilled_document_id:
            raise ValidationError({"status": "Only a document the client is delivering can be received."})
        required_checks = ("correct_client", "readable_complete", "matter_link_confirmed")
        if not all(str(data.get(key, "")).lower() in {"true", "1", "yes", "on"} for key in required_checks):
            raise ValidationError({"checks": "Confirm the client, that the paper is complete and legible, and the matter link."})
        document = item.fulfilled_document
        client = item.client
        source_copy_type = data.get("source_copy_type") or ClientDocument.SourceCopyType.CLIENT_COPY
        if source_copy_type not in ClientDocument.SourceCopyType.values:
            raise ValidationError({"source_copy_type": "Say whether this is an original, a certified copy or a copy."})
        held_in = location_or_error(item.firm, data.get("location_id"))

        if not document.reference:
            if document.classification == ClientDocument.Classification.CLIENT_KYC:
                if not client.kyc_drawer_reference:
                    raise ValidationError({"kyc_drawer_reference": "Open the client's KYC file first, then receive the document into it."})
                document.reference = SecretaryDocumentService._next_document_reference(client)
            else:
                document.reference = MatterPhysicalFileService.next_document_reference(item.case)
        document.held_in = held_in
        document.source_copy_type = source_copy_type
        document.return_required = source_copy_type == ClientDocument.SourceCopyType.ORIGINAL and str(data.get("return_required", "")).lower() in {"true", "1", "yes", "on"}
        if document.return_required:
            document.expected_return_date = parse_date(str(data.get("expected_return_date") or "")) or None
            if not document.expected_return_date:
                raise ValidationError({"expected_return_date": "Record when the original is due back to the client."})
        document.physical_copy_retained = True
        document.received_at = timezone.now()
        document.received_by = user
        document.received_from = (data.get("received_from") or client.full_name).strip()
        notes = (data.get("custody_notes") or "").strip()
        document.custody_notes = " ".join(filter(None, [document.custody_notes, notes]))
        document.save()
        where = RecordsRoomService.where_is(document)
        typed = (data.get("physical_storage_location") or "").strip()
        document.physical_storage_location = " / ".join(filter(None, [where["location"] or typed, where["in_file"]]))
        if not document.physical_storage_location:
            raise ValidationError({"location_id": "Record where the paper is filed: open the client's KYC file or the matter file first."})
        document.save(update_fields=["physical_storage_location", "updated_at"])

        item.status = DocumentRequest.Status.UPLOADED
        item.secretary_verified_by = user
        item.secretary_verified_at = timezone.now()
        item.secretary_verification_notes = (data.get("notes") or "").strip()
        item.save(update_fields=["status", "secretary_verified_by", "secretary_verified_at", "secretary_verification_notes", "updated_at"])
        DocumentWorkflowService._notify_lawyer_of_upload(item, user)
        return DocumentWorkflowService.serialize_request(item)

    @staticmethod
    def workspace(user, params):
        firm = SecretaryDocumentService.records_keeper(user, "Only active secretaries can access this document workspace.")
        cases = SecretaryDocumentService.records_cases(user, firm)
        client_id = params.get("client_id")
        case_id = params.get("case_id")
        if case_id and not client_id:
            case = cases.filter(id=case_id).only("client_id").first()
            client_id = str(case.client_id) if case else None

        clients = Client.objects.filter(firm=firm).order_by("full_name")
        selection_error = ""
        if client_id:
            try:
                selected_client = clients.filter(id=client_id).first()
            except (ValueError, TypeError):
                selected_client = None
            if selected_client:
                scoped_cases = cases.filter(client=selected_client)
                if case_id and not scoped_cases.filter(id=case_id).exists():
                    selection_error = "The selected matter is no longer accessible for this client."
                    case_id = None
                documents = DocumentWorkflowService.documents_for_client(
                    selected_client,
                    query=(params.get("q") or "").strip(),
                )
                requests = DocumentWorkflowService.requests_for_client(
                    selected_client, case_id=case_id, include_undispatched=True
                ).filter(case__in=scoped_cases)
            else:
                selection_error = "The selected client is no longer available. Select a client again."
                client_id = None
                documents, requests = [], []
                scoped_cases = cases.none()
        else:
            documents, requests = [], []
            scoped_cases = cases.none()
        return {
            "next_kyc_reference": RecordsRoomService.preview_kyc_reference(firm),
            "kyc_places": RecordsRoomService.filing_places(firm, [StorageLocation.Purpose.KYC]),
            "originals_places": RecordsRoomService.filing_places(firm, [StorageLocation.Purpose.ORIGINALS]),
            "matter_places": RecordsRoomService.filing_places(firm, [StorageLocation.Purpose.MATTER]),
            # Papers clients have said they are bringing or sending, across this keeper's matters.
            "deliveries_expected": [
                DocumentWorkflowService.serialize_request(item)
                for item in DocumentRequest.objects.filter(case__in=cases, status=DocumentRequest.Status.PENDING_SECRETARY)
                .select_related("case", "client", "fulfilled_document", "secretary_verified_by", "dispatched_by")
                .order_by("fulfilled_at")
            ],
            "documents": [DocumentWorkflowService.serialize_document(item) for item in documents],
            "receipts": [
                DocumentWorkflowService.serialize_receipt(item)
                for item in PhysicalDocumentReceipt.objects.filter(client_id=client_id, firm=firm)
                .select_related("received_by", "client", "firm").prefetch_related("items").order_by("-received_at")
            ] if client_id else [],
            "requests": [DocumentWorkflowService.serialize_request(item) for item in requests],
            "selected_client_id": client_id,
            "selection_error": selection_error,
            "clients": [
                {
                    "id": str(item.id),
                    "name": item.full_name,
                    "client_type": item.client_type,
                    "kyc_drawer_reference": item.kyc_drawer_reference,
                    "kyc_cabinet_location": item.kyc_cabinet_location,
                    "received_from_options": SecretaryDocumentService.received_from_options(item),
                }
                for item in clients
            ],
            "cases": [{"id": str(item.id), "case_number": item.case_number, "title": item.title,
                       "client_id": str(item.client_id), "client_name": item.client.full_name}
                      for item in scoped_cases.select_related("client").order_by("-created_at")],
            "physical_file_queue": [{
                "case_id": str(item.matter_id), "case_number": item.reference,
                "title": item.matter.title, "client_name": item.matter.client.full_name,
                "responsible_advocate": item.matter.assigned_lawyer.user.full_name if item.matter.assigned_lawyer_id else "Not assigned",
                "opened_at": item.matter.created_at, "priority": item.matter.get_priority_display(),
                "status": item.status, "status_label": item.get_status_display(),
            } for item in MatterPhysicalFile.objects.filter(
                matter__in=cases,
                status__in=[MatterPhysicalFile.Status.REQUESTED, MatterPhysicalFile.Status.AWAITING_PREPARATION],
            ).select_related("matter__client", "matter__assigned_lawyer__user").order_by("matter__created_at")],
            "physical_file": (
                MatterPhysicalFileService.serialize(MatterPhysicalFile.objects.get(matter_id=case_id, firm=firm), include_history=False)
                if case_id and MatterPhysicalFile.objects.filter(matter_id=case_id, firm=firm).exists()
                else None
            ),
        }

    @staticmethod
    @transaction.atomic
    def register_physical_document(user, data):
        firm = SecretaryDocumentService.records_keeper(user, "Only active secretaries can register physical client documents.")

        request = None
        request_id = data.get("request_id")
        if request_id:
            try:
                request = DocumentRequest.objects.select_for_update().select_related("case", "client").get(
                    id=request_id,
                    firm=firm,
                )
            except DocumentRequest.DoesNotExist as exc:
                raise ValidationError({"request_id": "The document request is not accessible."}) from exc
            if request.status in {DocumentRequest.Status.ACCEPTED, DocumentRequest.Status.CANCELLED}:
                raise ValidationError({"request_id": "This document request is already closed."})
            client = request.client
        else:
            client_id = data.get("client_id")
            try:
                client = Client.objects.select_for_update().get(id=client_id, firm=firm)
            except (Client.DoesNotExist, ValueError, TypeError) as exc:
                raise ValidationError({"client_id": "Select a client file."}) from exc

        subtype = data.get("subtype") or ClientDocument.Subtype.OTHER
        classification = data.get("classification") or ClientDocument.Classification.CLIENT_KYC
        kyc_subtypes = {
            ClientDocument.Subtype.NATIONAL_ID, ClientDocument.Subtype.PASSPORT,
            ClientDocument.Subtype.ALIEN_ID, ClientDocument.Subtype.KRA_PIN,
            ClientDocument.Subtype.PROOF_OF_ADDRESS, ClientDocument.Subtype.INCORPORATION,
            ClientDocument.Subtype.CR12, ClientDocument.Subtype.BUSINESS_REGISTRATION,
            ClientDocument.Subtype.TRUST_DEED, ClientDocument.Subtype.AUTHORITY_TO_INSTRUCT,
            ClientDocument.Subtype.ENGAGEMENT_LETTER,
        }
        matter_subtypes = {
            ClientDocument.Subtype.SALE_AGREEMENT, ClientDocument.Subtype.CONTRACT,
            ClientDocument.Subtype.INVOICE, ClientDocument.Subtype.RECEIPT,
            ClientDocument.Subtype.DELIVERY_NOTE, ClientDocument.Subtype.CORRESPONDENCE,
        }
        if classification != ClientDocument.Classification.CLIENT_KYC:
            raise ValidationError({"classification": "Use the matter-evidence or controlled originals workflow for non-KYC documents."})
        if subtype in matter_subtypes:
            raise ValidationError({"subtype": "Contracts, invoices, delivery records and dispute correspondence cannot normally be registered in the KYC drawer."})
        if subtype not in kyc_subtypes | {ClientDocument.Subtype.OTHER} and not (data.get("exception_reason") or "").strip():
            raise ValidationError({"exception_reason": "This is not a standard KYC document. Authorised records staff must record the exception reason."})
        document_owner_subject = SecretaryDocumentService.resolve_document_subject(
            client, subtype, data.get("document_owner_contact")
        )
        title = (data.get("title") or (request.title if request else "")).strip()
        if not title:
            raise ValidationError({"title": "Record the physical document title."})
        if client.client_type != Client.ClientType.INDIVIDUAL and subtype in {
            ClientDocument.Subtype.NATIONAL_ID,
            ClientDocument.Subtype.PASSPORT,
            ClientDocument.Subtype.ALIEN_ID,
        }:
            type_label = dict(ClientDocument.Subtype.choices)[subtype]
            title = f"{type_label} — {document_owner_subject}"
        if not client.kyc_drawer_reference:
            raise ValidationError({"kyc_drawer_reference": "Assign the client's physical KYC drawer number before recording documents."})
        Client.objects.select_for_update().get(pk=client.pk)
        document_reference = (data.get("document_reference") or "").strip().upper()
        if not document_reference and str(data.get("automatic_reference", "")).lower() in {"true", "1", "yes", "on"}:
            document_reference = SecretaryDocumentService._next_document_reference(client)
        if not document_reference:
            raise ValidationError({"document_reference": "Confirm the exact physical reference or choose automatic numbering."})
        if not SecretaryDocumentService.DOCUMENT_REFERENCE_PATTERN.fullmatch(document_reference):
            raise ValidationError({"document_reference": f"Use a reference under this KYC file, for example {client.kyc_drawer_reference}/D1."})
        if not document_reference.startswith(f"{client.kyc_drawer_reference}/"):
            raise ValidationError({"document_reference": "The document reference must belong to the selected client's KYC file."})
        if ClientDocument.objects.filter(
            firm=client.firm, reference=document_reference, archived_at__isnull=True
        ).exists():
            raise ValidationError({"document_reference": "This physical document reference is already recorded in this firm."})
        received_from = SecretaryDocumentService.resolve_received_from(
            client, data.get("received_from_contact") or "CLIENT"
        )
        drawer_location = (data.get("physical_storage_location") or client.kyc_cabinet_location or "").strip()
        if not drawer_location:
            raise ValidationError({"physical_storage_location": "Record the document's exact physical location."})
        verification_status = data.get("verification_status") or ClientDocument.VerificationStatus.NOT_VERIFIED
        if verification_status not in ClientDocument.VerificationStatus.values:
            raise ValidationError({"verification_status": "Select a valid verification status."})
        if verification_status == ClientDocument.VerificationStatus.VERIFIED and not (data.get("verification_method") or "").strip():
            raise ValidationError({"verification_method": "Record how the physical document was verified."})
        if (data.get("category") or ClientDocument.Category.OTHER) not in ClientDocument.Category.values:
            raise ValidationError({"category": "Select a valid broad document category."})
        if (data.get("subtype") or ClientDocument.Subtype.OTHER) not in ClientDocument.Subtype.values:
            raise ValidationError({"subtype": "Select a valid exact document type."})
        document_identifier = (data.get("document_identifier") or "").strip()
        if (data.get("source_copy_type") or ClientDocument.SourceCopyType.CLIENT_COPY) not in ClientDocument.SourceCopyType.values:
            raise ValidationError({"source_copy_type": "Select original, certified copy, ordinary copy, or official electronic record."})
        try:
            page_count = int(data.get("page_count") or 1)
        except (TypeError, ValueError) as exc:
            raise ValidationError({"page_count": "Record a valid physical page count."}) from exc
        if page_count < 1:
            raise ValidationError({"page_count": "A received document must contain at least one page."})
        received_at = timezone.now()
        document = ClientDocument.objects.create(
            client=client, firm=client.firm,
            document_type=(request.document_type if request else data.get("document_type")) or "OTHER",
            title=title,
            reference=document_reference,
            classification=classification,
            description=(data.get("description") or "").strip(),
            category=data.get("category") or ClientDocument.Category.OTHER,
            subtype=subtype,
            document_owner_subject=document_owner_subject,
            document_identifier=document_identifier,
            issuing_authority=(data.get("issuing_authority") or "").strip(),
            document_date=data.get("document_date") or None,
            issue_date=data.get("issue_date") or None,
            expiry_date=data.get("expiry_date") or None,
            source_copy_type=data.get("source_copy_type") or ClientDocument.SourceCopyType.CLIENT_COPY,
            page_count=page_count,
            return_required=str(data.get("return_required", "")).lower() in {"true", "1", "yes", "on"},
            expected_return_date=data.get("expected_return_date") or None,
            visible_damage_or_alteration=str(data.get("visible_damage_or_alteration", "")).lower() in {"true", "1", "yes", "on"},
            condition_description=(data.get("condition_description") or "").strip(),
            confidentiality_level=data.get("confidentiality_level") or ClientDocument.Confidentiality.STANDARD,
            verification_status=verification_status,
            verification_method=(data.get("verification_method") or "").strip(),
            verified_by=user if verification_status == ClientDocument.VerificationStatus.VERIFIED else None,
            verified_at=timezone.now() if verification_status == ClientDocument.VerificationStatus.VERIFIED else None,
            is_verified=verification_status == ClientDocument.VerificationStatus.VERIFIED,
            review_notes=(data.get("review_notes") or "").strip(),
            file="",
            uploaded_by=None,
            physical_copy_retained=str(data.get("physical_copy_retained", "true")).lower() in {"true", "1", "yes", "on"},
            physical_storage_location=drawer_location,
            custody_notes=(data.get("custody_notes") or "").strip(),
            received_via=data.get("received_via") or ClientDocument.ReceivedVia.IN_PERSON,
            received_from=received_from,
            received_by=user,
            received_at=received_at,
            is_confidential=True,
            digital_copy_available=False,
            created_by=user,
            updated_by=user,
        )
        ClientDocumentCustodyMovement.objects.create(
            document=document, from_location_or_custodian=received_from,
            to_location_or_custodian=drawer_location,
            movement_type=ClientDocumentCustodyMovement.MovementType.RECEIVED,
            released_by=user, received_by=user, moved_at=document.received_at,
            purpose="Initial receipt into the firm's physical document register.",
            expected_return_at=None, notes=document.custody_notes,
        )
        match = re.fullmatch(rf"{re.escape(client.kyc_drawer_reference)}/D(\d+)", document_reference)
        if match:
            sequence, _ = ClientDocumentReferenceSequence.objects.get_or_create(client=client)
            sequence = ClientDocumentReferenceSequence.objects.select_for_update().get(client=client)
            sequence.next_number = max(sequence.next_number, int(match.group(1)) + 1)
            sequence.save(update_fields=["next_number", "updated_at"])
        if request:
            request.fulfilled_document = document
            request.fulfilled_by = user
            request.fulfilled_at = timezone.now()
            request.status = DocumentRequest.Status.UPLOADED
            request.secretary_verified_by = user
            request.secretary_verified_at = timezone.now()
            request.secretary_verification_notes = (data.get("description") or "Physical document recorded in the KYC drawer.").strip()
            request.save(update_fields=[
                "fulfilled_document", "fulfilled_by", "fulfilled_at", "status",
                "secretary_verified_by", "secretary_verified_at",
                "secretary_verification_notes", "updated_at",
            ])
            DocumentWorkflowService._notify_lawyer_of_upload(request, user)
        return document

    @staticmethod
    @transaction.atomic
    def correct_document_reference(user, document_id, data):
        firm = SecretaryDocumentService.records_keeper(user, "Only authorised records staff can correct physical references.")
        document = ClientDocument.objects.select_for_update().select_related("client").get(id=document_id, firm=firm)
        corrected = (data.get("corrected_reference") or "").strip().upper()
        reason = (data.get("reason") or "").strip()
        if not reason:
            raise ValidationError({"reason": "Record the reason for correcting this immutable reference."})
        if not SecretaryDocumentService.DOCUMENT_REFERENCE_PATTERN.fullmatch(corrected) or not corrected.startswith(f"{document.client.kyc_drawer_reference}/"):
            raise ValidationError({"corrected_reference": "Use a valid reference under the client's current KYC file."})
        if ClientDocument.objects.filter(firm=document.firm, reference=corrected).exclude(pk=document.pk).exists():
            raise ValidationError({"corrected_reference": "That document reference is already in use."})
        previous = document.reference
        document.reference = corrected
        document.updated_by = user
        document.save(update_fields=["reference", "updated_by", "updated_at"])
        ClientDocumentReferenceCorrection.objects.create(
            document=document, previous_reference=previous, corrected_reference=corrected,
            reason=reason, corrected_by=user,
        )
        return document

    @staticmethod
    @transaction.atomic
    def remove_from_register(user, document_id, data):
        firm = SecretaryDocumentService.records_keeper(user, "Only authorised records staff can remove physical register entries.")
        try:
            document = ClientDocument.objects.select_for_update().get(
                id=document_id, firm=firm, archived_at__isnull=True
            )
        except ClientDocument.DoesNotExist as exc:
            raise ValidationError({"document": "This active physical document entry was not found."}) from exc
        reason = (data.get("reason") or "").strip()
        if not reason:
            raise ValidationError({"reason": "Record why this document is being removed from the active register."})
        document.archived_at = timezone.now()
        document.updated_by = user
        document.save(update_fields=["archived_at", "updated_by", "updated_at"])
        ClientDocumentRegisterRemoval.objects.create(
            document=document, reason=reason, removed_by=user,
        )
        return document

    @staticmethod
    @transaction.atomic
    def record_custody_movement(user, document_id, data):
        firm = SecretaryDocumentService.records_keeper(user, "Only authorised records staff can record custody movements.")
        document = ClientDocument.objects.select_for_update().get(id=document_id, firm=firm)
        destination = (data.get("to_location_or_custodian") or "").strip()
        purpose = (data.get("purpose") or "").strip()
        if not destination or not purpose:
            raise ValidationError({"movement": "Destination and purpose are required."})
        movement = ClientDocumentCustodyMovement.objects.create(
            document=document,
            from_location_or_custodian=document.physical_storage_location,
            to_location_or_custodian=destination,
            movement_type=data.get("movement_type") or ClientDocumentCustodyMovement.MovementType.TRANSFER,
            released_by=user, received_by=user,
            moved_at=data.get("moved_at") or timezone.now(), purpose=purpose,
            expected_return_at=data.get("expected_return_at") or None,
            actual_return_at=data.get("actual_return_at") or None,
            notes=(data.get("notes") or "").strip(),
        )
        document.physical_storage_location = destination
        document.updated_by = user
        document.save(update_fields=["physical_storage_location", "updated_by", "updated_at"])
        return movement

    @staticmethod
    @transaction.atomic
    def create_receipt(user, data):
        firm = SecretaryDocumentService.records_keeper(user, "Only authorised records staff can issue document receipts.")
        client = Client.objects.select_for_update().get(id=data.get("client_id"), firm=firm)
        requested_ids = {str(item) for item in (data.get("document_ids") or [])}
        documents = list(ClientDocument.objects.select_for_update().filter(
            id__in=requested_ids, client=client, firm=firm,
            archived_at__isnull=True,
        ))
        if not documents:
            raise ValidationError({"document_ids": "Select at least one unreceipted physical document."})
        if len(documents) != len(requested_ids):
            raise ValidationError({"document_ids": "Every selected document must be an unreceipted record belonging to this client."})
        if PhysicalDocumentReceiptItem.objects.filter(document__in=documents).exists():
            raise ValidationError({"document_ids": "A selected document already appears on a receipt."})
        received_from = SecretaryDocumentService.resolve_received_from(
            client, data.get("received_from_contact") or "CLIENT"
        )
        received_timestamps = [item.received_at for item in documents if item.received_at]
        if len(received_timestamps) != len(documents):
            raise ValidationError({"document_ids": "Every selected document must have an authoritative received timestamp."})
        # One receipt represents the delivery batch. Use the first server-recorded
        # intake timestamp; the individual document timestamps remain unchanged.
        received_at = min(received_timestamps)
        year = timezone.now().year
        sequence, _ = PhysicalDocumentReceiptSequence.objects.get_or_create(
            firm=firm, defaults={"year": year, "next_number": 1}
        )
        sequence = PhysicalDocumentReceiptSequence.objects.select_for_update().get(firm=firm)
        if sequence.year != year:
            sequence.year, sequence.next_number = year, 1
        number = sequence.next_number
        sequence.next_number += 1
        sequence.save(update_fields=["year", "next_number", "updated_at"])
        receipt = PhysicalDocumentReceipt.objects.create(
            firm=firm, client=client,
            receipt_number=f"REC-{timezone.now().year}-{number:05d}",
            received_from=received_from,
            received_by=user, received_at=received_at,
            kyc_reference_snapshot=client.kyc_drawer_reference,
            # The letterhead as it stood when the papers were received; the printed copy uses it.
            firm_details_snapshot={"name": firm.name, **(AuthService.firm_payload(firm)["contact"] or {})},
        )
        for document in documents:
            PhysicalDocumentReceiptItem.objects.create(
                receipt=receipt, document=document,
                document_reference_snapshot=document.reference, title_snapshot=document.title,
                subtype_snapshot=document.subtype, copy_type_snapshot=document.source_copy_type,
                page_count_snapshot=document.page_count,
                condition_snapshot=document.condition_description or "No visible damage recorded",
                return_required_snapshot=document.return_required,
            )
        return receipt
