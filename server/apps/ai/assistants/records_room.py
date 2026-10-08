"""What the assistants know about the firm's paper records.

Sheria Master stores no document files. Every paper is held physically, in a
client's KYC file or a matter file, in a labelled drawer, shelf or safe. These
helpers give an assistant the references and locations it may share, so it can
answer "where is the client's ID?" the way the registry clerk would.
"""
from django.db.models import Prefetch

from apps.cases.models import CaseAttachment, MatterPhysicalFile
from apps.clients.models import ClientDocument
from apps.documents.models import DocumentRequest
from apps.firm.services.records_room_service import RecordsRoomService

MAX_DOCUMENTS = 150

RECORDS_ROOM_RULES = """
Paper records:
- The firm keeps no document files in Sheria Master. Every document is paper held in the firm's records room: client identity papers in the client's KYC file (for example KYC-2026-039, with documents numbered KYC-2026-039/D1, /D2), case papers in the matter file (numbered <matter number>/D001), and valuable originals often in a safe.
- To answer "where is X?", use records_room in RECORDS: give the document's reference, the file it is in, and its location (room › cabinet › drawer or shelf). If it is checked out or released, say to whom.
- Never claim to open, read, send or show a document's contents; you only know its reference, title and where the paper is. If a document is not in records_room, say it is not recorded, and that it may still be on its way or not yet filed.
- Documents awaiting_delivery are papers a client has promised to bring or send; the firm files them on arrival."""


def _file_place(physical_file):
    if physical_file is None:
        return None
    return {
        "reference": physical_file.reference,
        "location": physical_file.location or None,
        "status": physical_file.get_status_display(),
        "with": physical_file.current_custodian.full_name if physical_file.current_custodian_id else None,
    }


def records_room_view(cases, clients):
    """KYC files, matter files and the documents in them, with locations, for staff assistants."""
    cases = list(cases)
    clients = list(clients)
    physical_files = {
        item.matter_id: item
        for item in MatterPhysicalFile.objects.filter(matter__in=cases).select_related("storage_location__parent__parent", "current_custodian")
    }
    documents = (
        ClientDocument.objects.filter(client__in=clients, archived_at__isnull=True)
        .select_related("client__kyc_location__parent__parent", "held_in__parent__parent")
        .prefetch_related(Prefetch("matter_references__case__physical_file"), "custody_movements__received_by")
        .order_by("-created_at")[:MAX_DOCUMENTS]
    )
    attachments = (
        CaseAttachment.objects.filter(case__in=cases)
        .exclude(document_reference="")
        .select_related("case")
        .order_by("-created_at")[:MAX_DOCUMENTS]
    )
    return {
        "kyc_files": [
            {
                "client": client.full_name,
                "kyc_file": client.kyc_drawer_reference or "not opened yet",
                "location": (client.kyc_location.path if client.kyc_location_id else client.kyc_cabinet_location) or None,
            }
            for client in clients
        ],
        "matter_files": [
            {"matter": case.case_number, "client": case.client.full_name, **(_file_place(physical_files.get(case.id)) or {"status": "not prepared yet"})}
            for case in cases
        ],
        "client_documents": [
            {
                "title": document.title,
                "client": document.client.full_name,
                "matters": [ref.case.case_number for ref in document.matter_references.all()],
                "copy": document.get_source_copy_type_display(),
                **({"original_due_back": str(document.expected_return_date)} if document.return_required else {}),
                **RecordsRoomService.where_is(document),
            }
            for document in documents
        ],
        "matter_documents": [
            {
                "reference": item.document_reference,
                "title": item.title,
                "matter": item.case.case_number,
                "section": item.get_physical_section_display(),
                "copy": item.get_physical_copy_type_display(),
                "location": item.physical_storage_location or None,
            }
            for item in attachments
        ],
        "awaiting_delivery": [
            {"document": item.title, "client": item.client.full_name, "matter": item.case.case_number, "note": item.fulfilled_document.custody_notes if item.fulfilled_document_id else ""}
            for item in DocumentRequest.objects.filter(case__in=cases, status=DocumentRequest.Status.PENDING_SECRETARY).select_related("client", "case", "fulfilled_document")
        ],
    }


def client_records_room_view(client):
    """A client's own papers: references and status, never the cabinet position."""
    documents = (
        ClientDocument.objects.filter(client=client, archived_at__isnull=True, is_client_visible=True)
        .select_related("held_in")
        .prefetch_related("matter_references__case__physical_file", "custody_movements__received_by")
        .order_by("-created_at")[:MAX_DOCUMENTS]
    )
    requests = DocumentRequest.objects.filter(client=client).exclude(
        status__in=[DocumentRequest.Status.AWAITING_SECRETARY_DISPATCH, DocumentRequest.Status.CANCELLED, DocumentRequest.Status.ACCEPTED]
    ).select_related("case")
    return {
        "your_kyc_file": client.kyc_drawer_reference or "not opened yet",
        "documents_the_firm_needs_from_you": [
            {"document": item.title, "matter": item.case.case_number, "status": item.get_status_display(), "due": str(item.due_date) if item.due_date else None}
            for item in requests
        ],
        "your_documents": [
            {
                "title": document.title,
                "matters": [ref.case.case_number for ref in document.matter_references.all()],
                **({"original_due_back_to_you": str(document.expected_return_date)} if document.return_required else {}),
                **RecordsRoomService.where_is(document, include_position=False),
            }
            for document in documents
        ],
    }
