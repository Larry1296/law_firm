import re

from rest_framework.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from apps.clients.models import Client
from apps.clients.models import (
    ClientDocument, ClientDocumentCustodyMovement,
    ClientDocumentReferenceCorrection, ClientDocumentReferenceSequence,
    ClientKYCReferenceHistory,
)
from apps.cases.models import Case
from apps.documents.models import (
    DocumentRequest, PhysicalDocumentReceipt, PhysicalDocumentReceiptItem,
    PhysicalDocumentReceiptSequence,
)
from apps.documents.models import MatterDocumentReference
from apps.communications.services import ChatService
from apps.documents.services.workflow_service import DocumentWorkflowService


class SecretaryDocumentService:
    DRAWER_REFERENCE_PATTERN = re.compile(r"^KYC-\d{4}-\d{3,}$")
    DOCUMENT_REFERENCE_PATTERN = re.compile(r"^KYC-\d{4}-\d{3,}/[A-Z0-9][A-Z0-9._/-]{0,39}$")

    @staticmethod
    @staticmethod
    @transaction.atomic
    def assign_kyc_drawer(user, data):
        secretary = getattr(user, "secretary_profile", None)
        if not secretary or not secretary.is_active or not secretary.can_receive_documents:
            raise ValidationError({"detail": "Only active secretaries can assign KYC drawers."})
        try:
            client = Client.objects.select_for_update().get(id=data.get("client_id"), firm=secretary.law_firm)
        except (Client.DoesNotExist, ValueError, TypeError) as exc:
            raise ValidationError({"client_id": "Select a client file."}) from exc
        reference = (data.get("kyc_drawer_reference") or "").strip().upper()
        if not SecretaryDocumentService.DRAWER_REFERENCE_PATTERN.fullmatch(reference):
            raise ValidationError({"kyc_drawer_reference": "Use the physical drawer format KYC-2026-039."})
        if Client.objects.exclude(id=client.id).filter(firm=secretary.law_firm, kyc_drawer_reference=reference).exists():
            raise ValidationError({"kyc_drawer_reference": "This physical KYC drawer number is already assigned."})
        cabinet_location = (data.get("cabinet_location") or "").strip()
        reason = (data.get("reason") or "Initial physical KYC file assignment").strip()
        if client.kyc_drawer_reference and client.kyc_drawer_reference != reference and not data.get("reason"):
            raise ValidationError({"reason": "Explain why the physical KYC file reference is changing."})
        previous_reference = client.kyc_drawer_reference or ""
        previous_location = client.kyc_cabinet_location
        client.kyc_drawer_reference = reference
        client.kyc_cabinet_location = cabinet_location
        client.kyc_reference_assigned_by = user
        client.kyc_reference_assigned_at = timezone.now()
        try:
            client.save(update_fields=["kyc_drawer_reference", "kyc_cabinet_location", "kyc_reference_assigned_by", "kyc_reference_assigned_at", "updated_at"])
        except IntegrityError as exc:
            raise ValidationError({"kyc_drawer_reference": "This physical KYC file reference is already assigned in this firm."}) from exc
        ClientKYCReferenceHistory.objects.create(
            client=client, previous_reference=previous_reference, new_reference=reference,
            previous_cabinet_location=previous_location, new_cabinet_location=cabinet_location,
            reason=reason, changed_by=user,
        )
        return {"client_id": str(client.id), "kyc_drawer_reference": reference, "cabinet_location": cabinet_location}

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
        secretary = getattr(user, "secretary_profile", None)
        if not secretary or not secretary.is_active or not secretary.can_receive_documents:
            raise ValidationError({"detail": "Only active authorised records staff can propose references."})
        try:
            client = Client.objects.select_for_update().get(id=client_id, firm=secretary.law_firm)
        except Client.DoesNotExist as exc:
            raise ValidationError({"client_id": "Select a client file."}) from exc
        if not client.kyc_drawer_reference:
            raise ValidationError({"kyc_drawer_reference": "Assign the client's KYC file reference first."})
        # A proposal reserves a number so concurrent users cannot receive the same value.
        return {"document_reference": SecretaryDocumentService._next_document_reference(client)}

    @staticmethod
    def create_request(user, data):
        secretary = getattr(user, "secretary_profile", None)
        cases = DocumentWorkflowService.accessible_cases_for_secretary(user)
        try:
            case = cases.select_related("client__user", "firm").get(id=data.get("case_id"))
        except Exception as exc:
            raise ValidationError({"case_id": "Select an accessible matter for this client."}) from exc
        title = (data.get("title") or "").strip()
        if not title:
            raise ValidationError({"title": "Describe the document required from the client."})
        item = DocumentRequest.objects.create(
            firm=case.firm, client=case.client, case=case, requested_by=user,
            title=title, document_type=data.get("document_type") or "OTHER",
            instructions=(data.get("instructions") or "").strip(),
            due_date=data.get("due_date") or None,
            status=DocumentRequest.Status.AWAITING_SECRETARY_DISPATCH,
        )
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
        if not item.client.user_id:
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
    def verify_client_upload(user, request_id, data):
        cases = DocumentWorkflowService.accessible_cases_for_secretary(user)
        try:
            item = DocumentRequest.objects.select_related(
                "fulfilled_document", "case__assigned_lawyer__user", "client", "secretary_verified_by"
            ).get(id=request_id, case__in=cases)
        except DocumentRequest.DoesNotExist as exc:
            raise ValidationError({"request_id": "The document request is not accessible."}) from exc
        if item.status != DocumentRequest.Status.PENDING_SECRETARY or not item.fulfilled_document_id:
            raise ValidationError({"status": "Only a client upload awaiting secretary verification can be confirmed."})
        required_checks = ("correct_client", "readable_complete", "matter_link_confirmed")
        if not all(str(data.get(key, "")).lower() in {"true", "1", "yes", "on"} for key in required_checks):
            raise ValidationError({"checks": "Confirm the client, readable/complete scan, and matter link."})
        document = item.fulfilled_document
        document.physical_copy_retained = str(data.get("physical_copy_retained", "")).lower() in {"true", "1", "yes", "on"}
        document.physical_storage_location = (data.get("physical_storage_location") or "").strip()
        document.custody_notes = (data.get("custody_notes") or "").strip()
        if not document.physical_copy_retained or not document.physical_storage_location:
            raise ValidationError({"physical_storage_location": "Confirm the official physical document and record its KYC drawer location."})
        document.save(update_fields=["physical_copy_retained", "physical_storage_location", "custody_notes", "updated_at"])
        item.status = DocumentRequest.Status.UPLOADED
        item.secretary_verified_by = user
        item.secretary_verified_at = timezone.now()
        item.secretary_verification_notes = (data.get("notes") or "").strip()
        item.save(update_fields=["status", "secretary_verified_by", "secretary_verified_at", "secretary_verification_notes", "updated_at"])
        DocumentWorkflowService._notify_lawyer_of_upload(item, user)
        return DocumentWorkflowService.serialize_request(item)

    @staticmethod
    def workspace(user, params):
        secretary = getattr(user, "secretary_profile", None)
        if not secretary or not secretary.is_active or not secretary.can_receive_documents:
            raise ValidationError({"detail": "Only active secretaries can access this document workspace."})
        cases = DocumentWorkflowService.accessible_cases_for_secretary(user)
        client_id = params.get("client_id")
        case_id = params.get("case_id")
        if case_id and not client_id:
            case = cases.filter(id=case_id).only("client_id").first()
            client_id = str(case.client_id) if case else None

        clients = Client.objects.filter(firm=secretary.law_firm).order_by("full_name")
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
                    case_id=case_id,
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
            "documents": [DocumentWorkflowService.serialize_document(item) for item in documents],
            "requests": [DocumentWorkflowService.serialize_request(item) for item in requests],
            "selected_client_id": client_id,
            "selection_error": selection_error,
            "clients": [
                {
                    "id": str(item.id),
                    "name": item.full_name,
                    "kyc_drawer_reference": item.kyc_drawer_reference,
                    "kyc_cabinet_location": item.kyc_cabinet_location,
                }
                for item in clients
            ],
            "cases": [{"id": str(item.id), "case_number": item.case_number, "title": item.title,
                       "client_id": str(item.client_id), "client_name": item.client.full_name}
                      for item in scoped_cases.select_related("client").order_by("-created_at")],
        }

    @staticmethod
    def upload(user, data):
        secretary = getattr(user, "secretary_profile", None)
        if not secretary or not secretary.is_active or not secretary.can_receive_documents:
            raise ValidationError({"detail": "Only active secretaries can upload client documents."})
        cases = DocumentWorkflowService.accessible_cases_for_secretary(user)
        case_id = data.get("case_id")
        client_id = data.get("client_id")
        if not case_id and data.get("request_id"):
            try:
                request = DocumentRequest.objects.get(id=data["request_id"], firm=secretary.law_firm)
                case_id = request.case_id
                client_id = request.client_id
            except DocumentRequest.DoesNotExist as exc:
                raise ValidationError({"request_id": "Document request was not found."}) from exc
        if case_id:
            try:
                case = cases.select_related("client").get(id=case_id)
            except Exception as exc:
                raise ValidationError({"case_id": "Select an accessible matter."}) from exc
            if client_id and str(case.client_id) != str(client_id):
                raise ValidationError({"case_id": "The selected matter does not belong to this client."})
            client = case.client
        else:
            try:
                client = Client.objects.get(id=client_id, firm=secretary.law_firm)
            except (Client.DoesNotExist, ValueError, TypeError) as exc:
                raise ValidationError({"client_id": "Select a client before uploading a document."}) from exc
        mutable_data = data.copy()
        mutable_data["physical_copy_retained"] = True
        if not (mutable_data.get("physical_storage_location") or "").strip():
            raise ValidationError({"physical_storage_location": "Record the official KYC drawer or physical client-file location."})
        return DocumentWorkflowService.upload(client=client, user=user, data=mutable_data)

    @staticmethod
    @transaction.atomic
    def register_physical_document(user, data):
        secretary = getattr(user, "secretary_profile", None)
        if not secretary or not secretary.is_active or not secretary.can_receive_documents:
            raise ValidationError({"detail": "Only active secretaries can register physical client documents."})

        cases = DocumentWorkflowService.accessible_cases_for_secretary(user)
        request = None
        request_id = data.get("request_id")
        if request_id:
            try:
                request = DocumentRequest.objects.select_for_update().select_related("case", "client").get(
                    id=request_id,
                    case__in=cases,
                )
            except DocumentRequest.DoesNotExist as exc:
                raise ValidationError({"request_id": "The document request is not accessible."}) from exc
            if request.status in {DocumentRequest.Status.ACCEPTED, DocumentRequest.Status.CANCELLED}:
                raise ValidationError({"request_id": "This document request is already closed."})
            case = request.case
            client = request.client
        else:
            case_id = data.get("case_id")
            client_id = data.get("client_id")
            case = None
            if case_id:
                try:
                    case = cases.select_related("client").get(id=case_id)
                except Case.DoesNotExist as exc:
                    raise ValidationError({"case_id": "Select an accessible matter."}) from exc
                client = case.client
            else:
                try:
                    client = Client.objects.get(id=client_id, firm=secretary.law_firm)
                except (Client.DoesNotExist, ValueError, TypeError) as exc:
                    raise ValidationError({"client_id": "Select a client file."}) from exc

        title = (data.get("title") or (request.title if request else "")).strip()
        if not title:
            raise ValidationError({"title": "Record the physical document title."})
        if not client.kyc_drawer_reference:
            raise ValidationError({"kyc_drawer_reference": "Assign the client's physical KYC drawer number before recording documents."})
        document_reference = (data.get("document_reference") or "").strip().upper()
        if not document_reference and str(data.get("automatic_reference", "")).lower() in {"true", "1", "yes", "on"}:
            Client.objects.select_for_update().get(pk=client.pk)
            document_reference = SecretaryDocumentService._next_document_reference(client)
        if not document_reference:
            raise ValidationError({"document_reference": "Confirm the exact physical reference or choose automatic numbering."})
        if not SecretaryDocumentService.DOCUMENT_REFERENCE_PATTERN.fullmatch(document_reference):
            raise ValidationError({"document_reference": f"Use a reference under this KYC file, for example {client.kyc_drawer_reference}/D1."})
        if not document_reference.startswith(f"{client.kyc_drawer_reference}/"):
            raise ValidationError({"document_reference": "The document reference must belong to the selected client's KYC file."})
        if ClientDocument.objects.filter(firm=client.firm, reference=document_reference).exists():
            raise ValidationError({"document_reference": "This physical document reference is already recorded in this firm."})
        received_from = (data.get("received_from") or "").strip()
        if not received_from:
            raise ValidationError({"received_from": "Record the person or organisation that delivered the document."})
        drawer_location = (data.get("physical_storage_location") or f"KYC DRAWER / {client.kyc_drawer_reference}").strip()
        verification_status = data.get("verification_status") or ClientDocument.VerificationStatus.NOT_VERIFIED
        if verification_status not in ClientDocument.VerificationStatus.values:
            raise ValidationError({"verification_status": "Select a valid verification status."})
        if verification_status == ClientDocument.VerificationStatus.VERIFIED and not (data.get("verification_method") or "").strip():
            raise ValidationError({"verification_method": "Record how the physical document was verified."})
        if (data.get("category") or ClientDocument.Category.OTHER) not in ClientDocument.Category.values:
            raise ValidationError({"category": "Select a valid broad document category."})
        if (data.get("subtype") or ClientDocument.Subtype.OTHER) not in ClientDocument.Subtype.values:
            raise ValidationError({"subtype": "Select a valid exact document type."})
        if (data.get("source_copy_type") or ClientDocument.SourceCopyType.CLIENT_COPY) not in ClientDocument.SourceCopyType.values:
            raise ValidationError({"source_copy_type": "Select original, certified copy, ordinary copy, or official electronic record."})
        received_at = data.get("received_at") or timezone.now()
        if isinstance(received_at, str):
            received_at = parse_datetime(received_at)
            if received_at is None:
                raise ValidationError({"received_at": "Enter a valid date and time received."})
            if timezone.is_naive(received_at):
                received_at = timezone.make_aware(received_at)
        document = ClientDocument.objects.create(
            client=client, firm=client.firm,
            document_type=(request.document_type if request else data.get("document_type")) or "OTHER",
            title=title,
            reference=document_reference,
            description=(data.get("description") or "").strip(),
            category=data.get("category") or ClientDocument.Category.OTHER,
            subtype=data.get("subtype") or ClientDocument.Subtype.OTHER,
            document_owner_subject=(data.get("document_owner_subject") or client.full_name).strip(),
            document_identifier=(data.get("document_identifier") or "").strip(),
            issuing_authority=(data.get("issuing_authority") or "").strip(),
            document_date=data.get("document_date") or None,
            issue_date=data.get("issue_date") or None,
            expiry_date=data.get("expiry_date") or None,
            source_copy_type=data.get("source_copy_type") or ClientDocument.SourceCopyType.CLIENT_COPY,
            page_count=data.get("page_count") or 1,
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
        if case:
            MatterDocumentReference.objects.get_or_create(
                case=case,
                document=document,
                defaults={
                    "purpose": data.get("purpose") or MatterDocumentReference.Purpose.CLIENT_INSTRUCTION,
                    "referenced_by": user,
                },
            )
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
        secretary = getattr(user, "secretary_profile", None)
        if not secretary or not secretary.is_active or not secretary.can_receive_documents:
            raise ValidationError({"detail": "Only authorised records staff can correct physical references."})
        document = ClientDocument.objects.select_for_update().select_related("client").get(id=document_id, firm=secretary.law_firm)
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
    def record_custody_movement(user, document_id, data):
        secretary = getattr(user, "secretary_profile", None)
        if not secretary or not secretary.is_active or not secretary.can_receive_documents:
            raise ValidationError({"detail": "Only authorised records staff can record custody movements."})
        document = ClientDocument.objects.select_for_update().get(id=document_id, firm=secretary.law_firm)
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
        secretary = getattr(user, "secretary_profile", None)
        if not secretary or not secretary.is_active or not secretary.can_receive_documents:
            raise ValidationError({"detail": "Only authorised records staff can issue document receipts."})
        client = Client.objects.select_for_update().get(id=data.get("client_id"), firm=secretary.law_firm)
        documents = list(ClientDocument.objects.filter(id__in=data.get("document_ids") or [], client=client, firm=secretary.law_firm))
        if not documents:
            raise ValidationError({"document_ids": "Select at least one registered physical document."})
        year = timezone.now().year
        sequence, _ = PhysicalDocumentReceiptSequence.objects.get_or_create(
            firm=secretary.law_firm, defaults={"year": year, "next_number": 1}
        )
        sequence = PhysicalDocumentReceiptSequence.objects.select_for_update().get(firm=secretary.law_firm)
        if sequence.year != year:
            sequence.year, sequence.next_number = year, 1
        number = sequence.next_number
        sequence.next_number += 1
        sequence.save(update_fields=["year", "next_number", "updated_at"])
        receipt = PhysicalDocumentReceipt.objects.create(
            firm=secretary.law_firm, client=client,
            receipt_number=f"REC-{timezone.now().year}-{number:05d}",
            received_from=(data.get("received_from") or documents[0].received_from).strip(),
            received_by=user, received_at=data.get("received_at") or documents[0].received_at or timezone.now(),
            kyc_reference_snapshot=client.kyc_drawer_reference,
            firm_details_snapshot={"name": secretary.law_firm.name},
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
