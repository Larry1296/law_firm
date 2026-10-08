from datetime import date

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.cases.models import Case
from apps.clients.models import Client, ClientDocument
from apps.common.choices import UserRole
from apps.documents.models import DocumentRequest
from apps.firm.models import LawFirm, StorageLocation
from apps.firm.services.records_room_service import RecordsRoomService
from apps.staff.models import Lawyer, Secretary
from apps.users.models import User


def user(email, role, phone):
    return User.objects.create_user(
        email=email, password="Strong-pass-123", first_name="Test", last_name="User",
        phone_number=phone, national_id_number=phone[-9:], role=role,
    )


class RecordsRoomTests(TestCase):
    """The system mirrors the firm's paper records room and stores no document files."""

    def setUp(self):
        self.owner = user("owner@records.test", UserRole.ADMIN, "+254744000001")
        self.firm = LawFirm.objects.create(name="Records Firm", registration_number="REC-1", owner=self.owner)
        self.lawyer_user = user("advocate@records.test", UserRole.STAFF, "+254744000002")
        self.lawyer = Lawyer.objects.create(
            user=self.lawyer_user, law_firm=self.firm, staff_number="RC-1", admission_number="P.105/9/20", date_hired=date(2020, 1, 1),
        )
        self.secretary_user = user("secretary@records.test", UserRole.STAFF, "+254744000003")
        self.secretary = Secretary.objects.create(user=self.secretary_user, law_firm=self.firm, staff_number="RC-2", date_hired=date(2021, 1, 1))
        self.client_user = user("client@records.test", UserRole.OFFICIAL_CLIENT, "+254744000004")
        self.client_record = Client.objects.create(
            firm=self.firm, user=self.client_user, created_by=self.owner, full_name="Wanjiru Kamau",
            client_type=Client.ClientType.INDIVIDUAL, lifecycle_status=Client.LifecycleStatus.OFFICIAL_CLIENT,
        )
        self.matter = Case.objects.create(
            firm=self.firm, client=self.client_record, created_by=self.owner, case_number="MAT-REC-001",
            title="Kamau v Landlord", case_type=Case.CaseType.CIVIL, assigned_lawyer=self.lawyer, assigned_secretary=self.secretary,
        )
        self.api = APIClient()

    def as_user(self, who):
        self.api.force_authenticate(who)
        return self.api

    def place(self, kind, label, parent=None, purpose=None, status=201):
        payload = {"kind": kind, "label": label, "parent_id": parent["id"] if parent else None}
        if purpose:
            payload["purpose"] = purpose
        response = self.as_user(self.owner).post("/api/admin/firm/records-room/", payload, format="json")
        self.assertEqual(response.status_code, status, response.data)
        return response.data

    def kyc_drawer(self):
        registry = self.place("ROOM", "Registry", purpose="KYC")
        cabinet = self.place("CABINET", "Cabinet B", registry)
        return self.place("DRAWER", "Drawer 3", cabinet)

    def test_owner_lays_out_rooms_cabinets_and_drawers_with_readable_paths(self):
        drawer = self.kyc_drawer()
        self.assertEqual(drawer["path"], "Registry › Cabinet B › Drawer 3")
        self.assertEqual(drawer["purpose"], "KYC")  # inherited from the room
        layout = self.as_user(self.owner).get("/api/admin/firm/records-room/").data
        self.assertEqual([item["depth"] for item in layout["locations"]], [0, 1, 2])
        self.assertEqual(layout["next_kyc_reference"], f"KYC-{timezone.localdate().year}-001")

    def test_layout_follows_the_physical_nesting(self):
        registry = self.place("ROOM", "Registry")
        self.place("DRAWER", "Loose drawer", registry, status=400)  # drawers sit in a cabinet or safe
        self.place("CABINET", "Floating cabinet", status=400)  # cabinets sit in a room
        self.place("ROOM", "Registry", status=400)  # labels are unique where they sit

    def test_staff_cannot_change_the_layout(self):
        response = self.as_user(self.secretary_user).post("/api/admin/firm/records-room/", {"kind": "ROOM", "label": "X"}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_kyc_files_are_numbered_automatically_and_placed_in_a_drawer(self):
        drawer = self.kyc_drawer()
        response = self.as_user(self.secretary_user).post("/api/staff/secretary/documents/", {
            "action": "assign_drawer", "client_id": str(self.client_record.id), "location_id": drawer["id"],
        }, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        year = timezone.localdate().year
        self.assertEqual(response.data["kyc_drawer_reference"], f"KYC-{year}-001")
        self.client_record.refresh_from_db()
        self.assertEqual(self.client_record.kyc_cabinet_location, "Registry › Cabinet B › Drawer 3")
        self.assertEqual(RecordsRoomService.preview_kyc_reference(self.firm), f"KYC-{year}-002")

    def test_a_drawer_holding_files_cannot_be_retired(self):
        drawer = self.kyc_drawer()
        self.as_user(self.secretary_user).post("/api/staff/secretary/documents/", {
            "action": "assign_drawer", "client_id": str(self.client_record.id), "location_id": drawer["id"],
        }, format="json")
        response = self.as_user(self.owner).patch(f"/api/admin/firm/records-room/{drawer['id']}/", {"is_active": False}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_client_delivers_paper_and_it_is_filed_by_reference_in_the_kyc_file(self):
        drawer = self.kyc_drawer()
        self.as_user(self.secretary_user).post("/api/staff/secretary/documents/", {
            "action": "assign_drawer", "client_id": str(self.client_record.id), "location_id": drawer["id"],
        }, format="json")
        request = DocumentRequest.objects.create(
            firm=self.firm, client=self.client_record, case=self.matter, requested_by=self.lawyer_user,
            title="Copy of national ID", document_type="IDENTIFICATION", status=DocumentRequest.Status.OPEN,
        )
        notice = self.as_user(self.client_user).post("/api/client/documents/", {
            "request_id": str(request.id), "delivery_method": "IN_PERSON",
        }, format="json")
        self.assertEqual(notice.status_code, 201, notice.data)

        received = self.as_user(self.secretary_user).patch(f"/api/staff/secretary/documents/requests/{request.id}/verify/", {
            "correct_client": True, "readable_complete": True, "matter_link_confirmed": True, "source_copy_type": "COPY",
        }, format="json")
        self.assertEqual(received.status_code, 200, received.data)
        document = ClientDocument.objects.get(id=received.data["fulfilled_document_id"])
        year = timezone.localdate().year
        self.assertEqual(document.reference, f"KYC-{year}-001/D1")
        self.assertFalse(document.file)
        self.assertEqual(RecordsRoomService.where_is(document), {
            "reference": f"KYC-{year}-001/D1", "in_file": f"KYC-{year}-001",
            "status": "filed", "location": "Registry › Cabinet B › Drawer 3",
        })
        # The client sees the reference and status, never the cabinet position.
        client_view = self.as_user(self.client_user).get("/api/client/documents/").data
        self.assertEqual(client_view["documents"][0]["where"], {"reference": f"KYC-{year}-001/D1", "in_file": f"KYC-{year}-001", "status": "filed"})

    def test_an_original_can_be_kept_in_the_safe_instead_of_its_file(self):
        drawer = self.kyc_drawer()
        strongroom = self.place("ROOM", "Strongroom", purpose="ORIGINALS")
        safe = self.place("SAFE", "Safe 1", strongroom)
        self.as_user(self.secretary_user).post("/api/staff/secretary/documents/", {
            "action": "assign_drawer", "client_id": str(self.client_record.id), "location_id": drawer["id"],
        }, format="json")
        request = DocumentRequest.objects.create(
            firm=self.firm, client=self.client_record, case=self.matter, requested_by=self.lawyer_user,
            title="Original title deed", document_type="REGISTRATION", status=DocumentRequest.Status.OPEN,
        )
        self.as_user(self.client_user).post("/api/client/documents/", {"request_id": str(request.id), "delivery_method": "COURIER"}, format="json")
        received = self.as_user(self.secretary_user).patch(f"/api/staff/secretary/documents/requests/{request.id}/verify/", {
            "correct_client": True, "readable_complete": True, "matter_link_confirmed": True,
            "source_copy_type": "ORIGINAL", "location_id": safe["id"],
            "return_required": True, "expected_return_date": "2027-01-31",
        }, format="json")
        self.assertEqual(received.status_code, 200, received.data)
        document = ClientDocument.objects.get(id=received.data["fulfilled_document_id"])
        self.assertEqual(RecordsRoomService.where_is(document)["location"], "Strongroom › Safe 1")
        self.assertTrue(document.return_required)

    def test_files_are_never_accepted(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        request = DocumentRequest.objects.create(
            firm=self.firm, client=self.client_record, case=self.matter, requested_by=self.lawyer_user,
            title="Copy of national ID", document_type="IDENTIFICATION", status=DocumentRequest.Status.OPEN,
        )
        response = self.as_user(self.client_user).post("/api/client/documents/", {
            "request_id": str(request.id), "file": SimpleUploadedFile("id.pdf", b"%PDF-1.4", content_type="application/pdf"),
        }, format="multipart")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(ClientDocument.objects.exists())


class AssistantRecordsRoomTests(RecordsRoomTests):
    """Each assistant knows where papers are, within what its user may see."""

    def file_national_id(self):
        drawer = self.kyc_drawer()
        self.as_user(self.secretary_user).post("/api/staff/secretary/documents/", {
            "action": "assign_drawer", "client_id": str(self.client_record.id), "location_id": drawer["id"],
        }, format="json")
        request = DocumentRequest.objects.create(
            firm=self.firm, client=self.client_record, case=self.matter, requested_by=self.lawyer_user,
            title="Copy of national ID", document_type="IDENTIFICATION", status=DocumentRequest.Status.OPEN,
        )
        self.as_user(self.client_user).post("/api/client/documents/", {"request_id": str(request.id), "delivery_method": "IN_PERSON"}, format="json")
        self.as_user(self.secretary_user).patch(f"/api/staff/secretary/documents/requests/{request.id}/verify/", {
            "correct_client": True, "readable_complete": True, "matter_link_confirmed": True,
        }, format="json")
        return f"KYC-{timezone.localdate().year}-001"

    def test_advocate_assistant_knows_where_their_clients_papers_are(self):
        from apps.ai.assistants.staff import AdvocateAssistant

        kyc = self.file_national_id()
        room = AdvocateAssistant().records(self.lawyer_user)["records_room"]
        self.assertEqual(room["kyc_files"], [{"client": "Wanjiru Kamau", "kyc_file": kyc, "location": "Registry › Cabinet B › Drawer 3"}])
        document = room["client_documents"][0]
        self.assertEqual((document["title"], document["reference"], document["location"]), ("Copy of national ID", f"{kyc}/D1", "Registry › Cabinet B › Drawer 3"))

    def test_another_advocate_does_not_see_those_papers(self):
        from apps.ai.assistants.staff import AdvocateAssistant

        self.file_national_id()
        other_user = user("other@records.test", UserRole.STAFF, "+254744000005")
        Lawyer.objects.create(user=other_user, law_firm=self.firm, staff_number="RC-3", admission_number="P.105/8/20", date_hired=date(2020, 1, 1))
        room = AdvocateAssistant().records(other_user)["records_room"]
        self.assertEqual((room["kyc_files"], room["client_documents"]), ([], []))

    def test_owner_assistant_sees_the_firm_records_room(self):
        from apps.ai.assistants.staff import FirmOwnerAssistant

        kyc = self.file_national_id()
        room = FirmOwnerAssistant().records(self.owner)["records_room"]
        self.assertEqual(room["client_documents"][0]["reference"], f"{kyc}/D1")

    def test_client_assistant_gets_references_but_not_positions(self):
        from apps.ai.assistants.client import ClientAssistant

        kyc = self.file_national_id()
        # As on a real request, the signed-in user is loaded fresh.
        papers = ClientAssistant().records(User.objects.get(id=self.client_user.id))["your_papers"]
        self.assertEqual(papers["your_kyc_file"], kyc)
        self.assertEqual(papers["your_documents"][0], {
            "title": "Copy of national ID", "matters": ["MAT-REC-001"],
            "reference": f"{kyc}/D1", "in_file": kyc, "status": "filed",
        })
        self.assertNotIn("Cabinet", str(papers))
