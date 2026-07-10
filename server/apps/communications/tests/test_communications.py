from datetime import date

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.cases.models import Case
from apps.clients.models import Client
from apps.common.choices import FirmRole, UserRole
from apps.communications.models import Announcement, AnnouncementRecipient, ChatMessage, ChatThread
from apps.firm.models import LawFirm, LawFirmMember
from apps.staff.models import Lawyer, Secretary
from apps.users.models import User


class CommunicationApiTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.admin = User.objects.create_user(
            email="comm-admin@example.com",
            password="strong-pass123",
            first_name="Admin",
            last_name="Owner",
            phone_number="+254755000001",
            national_id_number="755000001",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(
            name="Communication Firm",
            registration_number="COMM-FIRM-001",
            owner=self.admin,
        )

        self.secretary_user = User.objects.create_user(
            email="comm-secretary@example.com",
            password="strong-pass123",
            first_name="Sarah",
            last_name="Secretary",
            phone_number="+254755000002",
            national_id_number="755000002",
            role=UserRole.STAFF,
        )
        self.secretary = Secretary.objects.create(
            user=self.secretary_user,
            law_firm=self.firm,
            staff_number="SEC-COMM-001",
            date_hired=date(2026, 7, 1),
        )
        LawFirmMember.objects.create(
            firm=self.firm,
            user=self.secretary_user,
            role=FirmRole.SECRETARY,
            created_by=self.admin,
        )

        self.lawyer_user = User.objects.create_user(
            email="comm-lawyer@example.com",
            password="strong-pass123",
            first_name="Larry",
            last_name="Lawyer",
            phone_number="+254755000003",
            national_id_number="755000003",
            role=UserRole.STAFF,
        )
        self.lawyer = Lawyer.objects.create(
            user=self.lawyer_user,
            law_firm=self.firm,
            staff_number="LAW-COMM-001",
            admission_number="ADV-COMM-001",
            date_hired=date(2026, 7, 1),
        )
        LawFirmMember.objects.create(
            firm=self.firm,
            user=self.lawyer_user,
            role=FirmRole.LAWYER,
            created_by=self.admin,
        )

        self.other_lawyer_user = User.objects.create_user(
            email="comm-other-lawyer@example.com",
            password="strong-pass123",
            first_name="Other",
            last_name="Lawyer",
            phone_number="+254755000004",
            national_id_number="755000004",
            role=UserRole.STAFF,
        )
        self.other_lawyer = Lawyer.objects.create(
            user=self.other_lawyer_user,
            law_firm=self.firm,
            staff_number="LAW-COMM-002",
            admission_number="ADV-COMM-002",
            date_hired=date(2026, 7, 1),
        )
        LawFirmMember.objects.create(
            firm=self.firm,
            user=self.other_lawyer_user,
            role=FirmRole.LAWYER,
            created_by=self.admin,
        )

        self.client_user = User.objects.create_user(
            email="comm-client@example.com",
            password="strong-pass123",
            first_name="Mary",
            last_name="Client",
            phone_number="+254755000005",
            national_id_number="755000005",
            role=UserRole.OFFICIAL_CLIENT,
        )
        self.client = Client.objects.create(
            firm=self.firm,
            user=self.client_user,
            created_by=self.admin,
            full_name="Mary Client",
            email="comm-client@example.com",
            phone_number="+254755000005",
            national_id="755000005",
            client_type=Client.ClientType.INDIVIDUAL,
            lifecycle_status=Client.LifecycleStatus.OFFICIAL_CLIENT,
        )
        self.case = Case.objects.create(
            firm=self.firm,
            client=self.client,
            created_by=self.admin,
            case_number="CASE-COMM-001",
            title="Communication Test Case",
            case_type=Case.CaseType.CIVIL,
            court_type=Case.CourtType.HIGH_COURT,
            assigned_lawyer=self.lawyer,
            assigned_secretary=self.secretary,
        )

    def test_admin_creates_announcement_for_all_staff(self):
        self.api.force_authenticate(user=self.admin)
        response = self.api.post(
            reverse("admin-announcement-list"),
            {
                "title": "Office update",
                "body": "All staff meeting at 9 AM.",
                "audience_type": "ALL_STAFF",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Announcement.objects.count(), 1)
        self.assertEqual(AnnouncementRecipient.objects.count(), 3)

        self.api.force_authenticate(user=self.secretary_user)
        inbox = self.api.get(reverse("communication-announcements"))
        self.assertEqual(inbox.status_code, 200)
        self.assertEqual(len(inbox.data["announcements"]), 1)

    def test_admin_staff_direct_thread_is_private_to_participants_and_admins(self):
        self.api.force_authenticate(user=self.admin)
        response = self.api.post(
            reverse("admin-staff-thread-list"),
            {
                "staff_user_id": str(self.secretary_user.id),
                "subject": "Private update",
                "message": "Please call me after court.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        thread_id = response.data["thread"]["id"]

        self.api.force_authenticate(user=self.secretary_user)
        reply = self.api.post(
            reverse("communication-thread-messages", kwargs={"thread_id": thread_id}),
            {"body": "Noted."},
            format="json",
        )
        self.assertEqual(reply.status_code, 201, reply.data)

        self.api.force_authenticate(user=self.lawyer_user)
        forbidden = self.api.get(
            reverse("communication-thread-detail", kwargs={"thread_id": thread_id}),
        )
        self.assertEqual(forbidden.status_code, 404)

    def test_case_thread_allows_client_and_secretary_write_but_lawyer_read_only(self):
        self.api.force_authenticate(user=self.client_user)
        message = self.api.post(
            reverse("communication-case-messages", kwargs={"case_id": self.case.id}),
            {"body": "Do we have a hearing date?"},
            format="json",
        )
        self.assertEqual(message.status_code, 201, message.data)
        self.assertEqual(ChatThread.objects.count(), 1)
        self.assertEqual(ChatMessage.objects.count(), 1)

        self.api.force_authenticate(user=self.secretary_user)
        inbox = self.api.get(reverse("secretary-case-thread-list"))
        self.assertEqual(inbox.status_code, 200)
        self.assertEqual(len(inbox.data["threads"]), 1)

        secretary_reply = self.api.post(
            reverse("communication-case-messages", kwargs={"case_id": self.case.id}),
            {"body": "We will confirm after the registry update."},
            format="json",
        )
        self.assertEqual(secretary_reply.status_code, 201, secretary_reply.data)

        self.api.force_authenticate(user=self.lawyer_user)
        lawyer_read = self.api.get(
            reverse("communication-case-messages", kwargs={"case_id": self.case.id}),
        )
        self.assertEqual(lawyer_read.status_code, 200)
        self.assertEqual(len(lawyer_read.data["messages"]), 2)

        lawyer_reply = self.api.post(
            reverse("communication-case-messages", kwargs={"case_id": self.case.id}),
            {"body": "Lawyer should not be able to reply here."},
            format="json",
        )
        self.assertEqual(lawyer_reply.status_code, 403)

        self.api.force_authenticate(user=self.other_lawyer_user)
        other_lawyer_read = self.api.get(
            reverse("communication-case-messages", kwargs={"case_id": self.case.id}),
        )
        self.assertEqual(other_lawyer_read.status_code, 404)