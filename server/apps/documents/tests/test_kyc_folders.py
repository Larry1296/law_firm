"""Tests for the KYC folder and hierarchical document reference system."""

from datetime import date
from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.clients.models import Client, ClientDocument, ClientKycFolder
from apps.common.choices import UserRole
from apps.documents.models import MatterDocumentReference
from apps.documents.services.workflow_service import DocumentWorkflowService
from apps.firm.models import LawFirm
from apps.staff.models import Lawyer
from apps.users.models import User


class BaseKycTest(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.admin = User.objects.create_user(
            email="kyc-admin@example.test",
            password="strong-pass123",
            first_name="KYC",
            last_name="Admin",
            phone_number="+254711000099",
            national_id_number="KYCADMIN001",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(
            name="KYC Test Firm",
            registration_number="KYC-FIRM-001",
            owner=self.admin,
        )
        self.lawyer = Lawyer.objects.create(
            user=self.admin,
            law_firm=self.firm,
            staff_number="KYC-LAW-001",
            admission_number="ADV-KYC-001",
            date_hired=date(2026, 1, 1),
        )
        self.client_obj = Client.objects.create(
            firm=self.firm,
            full_name="Mutiso",
            email="mutiso@example.test",
            phone_number="+254722000099",
            national_id="MUTISO001",
            client_type=Client.ClientType.INDIVIDUAL,
        )
        self.api.force_authenticate(user=self.admin)

    def _make_upload(self, name="doc.pdf"):
        return SimpleUploadedFile(name, b"%PDF-1.4 fake content", content_type="application/pdf")


class KycFolderCreationTests(BaseKycTest):
    """Test that KYC folders are created with sequential references."""

    def test_first_folder_gets_001(self):
        folder = DocumentWorkflowService._resolve_or_create_kyc_folder(self.client_obj, self.admin)
        self.assertEqual(folder.reference, "KYC-2026-001")
        self.assertEqual(folder.client, self.client_obj)
        self.assertEqual(folder.firm, self.firm)

    def test_second_folder_gets_002(self):
        DocumentWorkflowService._resolve_or_create_kyc_folder(self.client_obj, self.admin)
        folder2 = DocumentWorkflowService._resolve_or_create_kyc_folder(self.client_obj, self.admin)
        # Re-uses the same open folder.
        self.assertEqual(folder2.reference, "KYC-2026-001")

    def test_new_folder_after_close(self):
        folder1 = DocumentWorkflowService._resolve_or_create_kyc_folder(self.client_obj, self.admin)
        folder1.status = ClientKycFolder.Status.CLOSED
        folder1.save()
        folder2 = DocumentWorkflowService._resolve_or_create_kyc_folder(self.client_obj, self.admin)
        self.assertEqual(folder2.reference, "KYC-2026-002")


class KycDocumentUploadTests(BaseKycTest):
    """Test that documents get hierarchical references like KYC-2026-039/D1."""

    def test_first_document_gets_d1(self):
        doc = DocumentWorkflowService.upload(
            client=self.client_obj,
            user=self.admin,
            data={
                "file": self._make_upload("id.pdf"),
                "document_type": "IDENTIFICATION",
                "title": "National ID – Mutiso",
                "physical_copy_retained": "true",
                "physical_storage_location": "Cabinet A, Drawer 1",
            },
        )
        self.assertEqual(doc.reference, "KYC-2026-001/D1")
        self.assertEqual(doc.document_index, 1)
        self.assertEqual(doc.kyc_folder.reference, "KYC-2026-001")

    def test_second_document_gets_d2(self):
        DocumentWorkflowService.upload(
            client=self.client_obj,
            user=self.admin,
            data={
                "file": self._make_upload("id.pdf"),
                "document_type": "IDENTIFICATION",
                "title": "National ID",
            },
        )
        doc2 = DocumentWorkflowService.upload(
            client=self.client_obj,
            user=self.admin,
            data={
                "file": self._make_upload("kra.pdf"),
                "document_type": "KRA_PIN",
                "title": "KRA PIN Certificate – Mutiso",
                "physical_copy_retained": "true",
                "physical_storage_location": "Cabinet B, Drawer 3",
            },
        )
        self.assertEqual(doc2.reference, "KYC-2026-001/D2")
        self.assertEqual(doc2.document_type, "KRA_PIN")

    def test_third_document_gets_d3(self):
        for i, (name, dtype) in enumerate([
            ("id.pdf", "IDENTIFICATION"),
            ("kra.pdf", "KRA_PIN"),
            ("title.pdf", "TITLE_DEED"),
        ]):
            DocumentWorkflowService.upload(
                client=self.client_obj,
                user=self.admin,
                data={"file": self._make_upload(name), "document_type": dtype, "title": f"Doc {i+1}"},
            )
        docs = ClientDocument.objects.filter(client=self.client_obj).order_by("document_index")
        refs = [d.reference for d in docs]
        self.assertEqual(refs, ["KYC-2026-001/D1", "KYC-2026-001/D2", "KYC-2026-001/D3"])

    def test_physical_location_required_when_retained(self):
        from rest_framework.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            DocumentWorkflowService.upload(
                client=self.client_obj,
                user=self.admin,
                data={
                    "file": self._make_upload(),
                    "document_type": "IDENTIFICATION",
                    "title": "ID",
                    "physical_copy_retained": "true",
                    # No physical_storage_location!
                },
            )


class AdvocateDocumentIdentityTests(BaseKycTest):
    """Test that an advocate can identify what a reference is."""

    def test_matter_reference_includes_document_identity(self):
        from apps.cases.models import Case
        case = Case.objects.create(
            firm=self.firm,
            client=self.client_obj,
            case_number="MAT-2026-00001",
            title="Mutiso Debt Recovery",
            case_type=Case.CaseType.DEBT_RECOVERY,
        )

        # Upload a KRA PIN document.
        doc = DocumentWorkflowService.upload(
            client=self.client_obj,
            user=self.admin,
            data={
                "file": self._make_upload("kra.pdf"),
                "document_type": "KRA_PIN",
                "title": "KRA PIN Certificate – Mutiso",
                "description": "Original KRA PIN certificate supplied by client.",
                "physical_copy_retained": "true",
                "physical_storage_location": "Cabinet B, Drawer 3",
                "case_id": str(case.id),
                "purpose": "EVIDENCE",
            },
        )

        # The advocate's view: query the matter's document references.
        ref = MatterDocumentReference.objects.get(case=case, document=doc)
        identity = ref.document_identity

        self.assertEqual(identity["reference"], "KYC-2026-001/D1")
        self.assertEqual(identity["kyc_folder"], "KYC-2026-001")
        self.assertEqual(identity["document_index"], 1)
        self.assertEqual(identity["title"], "KRA PIN Certificate – Mutiso")
        self.assertEqual(identity["document_type"], "KRA_PIN")
        self.assertEqual(identity["document_type_label"], "KRA PIN Certificate")
        self.assertEqual(identity["description"], "Original KRA PIN certificate supplied by client.")
        self.assertEqual(identity["physical_storage_location"], "Cabinet B, Drawer 3")
        self.assertTrue(identity["physical_copy_retained"])


class KycFolderApiTests(BaseKycTest):
    """Test the KYC folder REST API."""

    def test_create_kyc_folder_via_api(self):
        url = reverse("kyc-folder-list-create")
        response = self.api.post(url, {
            "client_id": str(self.client_obj.id),
            "notes": "Initial KYC for Mutiso debt recovery matter.",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        data = response.json()["data"]
        self.assertEqual(data["reference"], "KYC-2026-001")
        self.assertEqual(data["client_name"], "Mutiso")

    def test_list_kyc_folders_for_client(self):
        url = reverse("kyc-folder-list-create")
        self.api.post(url, {"client_id": str(self.client_obj.id)}, format="json")
        response = self.api.get(url, {"client_id": str(self.client_obj.id)})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["data"]), 1)

    def test_folder_detail_shows_documents(self):
        url = reverse("kyc-folder-list-create")
        create_resp = self.api.post(url, {"client_id": str(self.client_obj.id)}, format="json")
        folder_id = create_resp.json()["data"]["id"]

        DocumentWorkflowService.upload(
            client=self.client_obj,
            user=self.admin,
            data={
                "file": self._make_upload("id.pdf"),
                "document_type": "IDENTIFICATION",
                "title": "National ID",
            },
        )

        detail_url = reverse("kyc-folder-detail", kwargs={"kyc_folder_id": folder_id})
        response = self.api.get(detail_url)
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(data["document_count"], 1)
        self.assertEqual(data["documents"][0]["reference"], "KYC-2026-001/D1")
        self.assertEqual(data["documents"][0]["title"], "National ID")
