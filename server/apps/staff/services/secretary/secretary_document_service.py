import re

from rest_framework.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.clients.models import Client
from apps.clients.models import ClientDocument
from apps.cases.models import Case
from apps.documents.models import DocumentRequest
from apps.documents.models import MatterDocumentReference
from apps.communications.services import ChatService
from apps.documents.services.workflow_service import DocumentWorkflowService


class SecretaryDocumentService:
    DRAWER_REFERENCE_PATTERN = re.compile(r"^KYC-\d{4}-\d{3,}$")

    @staticmethod
    def assign_kyc_drawer(user, data):
        secretary = getattr(user, "secretary_profile", None)
        if not secretary or not secretary.is_active:
            raise ValidationError({"detail": "Only active secretaries can assign KYC drawers."})
        try:
            client = Client.objects.get(id=data.get("client_id"), firm=secretary.law_firm)
        except (Client.DoesNotExist, ValueError, TypeError) as exc:
            raise ValidationError({"client_id": "Select a client file."}) from exc
        reference = (data.get("kyc_drawer_reference") or "").strip().upper()
        if not SecretaryDocumentService.DRAWER_REFERENCE_PATTERN.fullmatch(reference):
            raise ValidationError({"kyc_drawer_reference": "Use the physical drawer format KYC-2026-039."})
        if Client.objects.exclude(id=client.id).filter(kyc_drawer_reference=reference).exists():
            raise ValidationError({"kyc_drawer_reference": "This physical KYC drawer number is already assigned."})
        client.kyc_drawer_reference = reference
        client.save(update_fields=["kyc_drawer_reference", "updated_at"])
        return {"client_id": str(client.id), "kyc_drawer_reference": reference}

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
        if not secretary or not secretary.is_active:
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
        if not secretary or not secretary.is_active:
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
        if not secretary or not secretary.is_active:
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
        if not document_reference:
            raise ValidationError({"document_reference": "Key in the exact reference shown on the physical document."})
        if ClientDocument.objects.filter(reference=document_reference).exists():
            raise ValidationError({"document_reference": "This physical document reference is already recorded."})
        received_from = (data.get("received_from") or "").strip()
        if not received_from:
            raise ValidationError({"received_from": "Record the person or organisation that delivered the document."})
        drawer_location = (data.get("physical_storage_location") or f"KYC DRAWER / {client.kyc_drawer_reference}").strip()
        document = ClientDocument.objects.create(
            client=client,
            document_type=(request.document_type if request else data.get("document_type")) or "OTHER",
            title=title,
            reference=document_reference,
            description=(data.get("description") or "").strip(),
            file="",
            uploaded_by=None,
            physical_copy_retained=True,
            physical_storage_location=drawer_location,
            custody_notes=(data.get("custody_notes") or "").strip(),
            received_via=data.get("received_via") or ClientDocument.ReceivedVia.IN_PERSON,
            received_from=received_from,
            received_by=user,
            received_at=timezone.now(),
            is_confidential=True,
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
