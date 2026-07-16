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
        self.secretary.assigned_lawyers.add(self.lawyer)

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

    def test_case_thread_is_client_safe_and_lawyer_read_only(self):
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
        secretary_messages = self.api.get(
            reverse("communication-case-messages", kwargs={"case_id": self.case.id}),
        )
        self.assertEqual(secretary_messages.status_code, 200, secretary_messages.data)
        self.assertEqual(len(secretary_messages.data["messages"]), 1)

        secretary_reply = self.api.post(
            reverse("communication-case-messages", kwargs={"case_id": self.case.id}),
            {"body": "We will coordinate with counsel and revert."},
            format="json",
        )
        self.assertEqual(secretary_reply.status_code, 201, secretary_reply.data)

        forward_to_lawyer = self.api.post(
            reverse(
                "communication-message-forward-lawyer",
                kwargs={"message_id": message.data["message"]["id"]},
            ),
            format="json",
        )
        self.assertEqual(forward_to_lawyer.status_code, 201, forward_to_lawyer.data)
        self.assertTrue(forward_to_lawyer.data["message"]["is_forwarded"])
        self.assertEqual(forward_to_lawyer.data["message"]["forward_direction"], "TO_LAWYER")

        self.api.force_authenticate(user=self.admin)
        admin_reply = self.api.post(
            reverse("communication-case-messages", kwargs={"case_id": self.case.id}),
            {"body": "We will confirm after the registry update."},
            format="json",
        )
        self.assertEqual(admin_reply.status_code, 201, admin_reply.data)

        self.api.force_authenticate(user=self.client_user)
        client_thread = self.api.get(
            reverse("communication-case-thread", kwargs={"case_id": self.case.id}),
        )
        self.assertEqual(client_thread.status_code, 200, client_thread.data)
        self.assertEqual(client_thread.data["thread"]["participants"], [])
        self.assertIn("firm", client_thread.data["thread"]["case"])
        self.assertNotIn("assigned_lawyer", client_thread.data["thread"]["case"])
        self.assertNotIn("assigned_secretary", client_thread.data["thread"]["case"])

        client_messages = self.api.get(
            reverse("communication-case-messages", kwargs={"case_id": self.case.id}),
        )
        self.assertEqual(client_messages.status_code, 200, client_messages.data)
        firm_sender = client_messages.data["messages"][1]["sender"]
        self.assertEqual(firm_sender["role"], "FIRM")
        self.assertEqual(firm_sender["full_name"], self.firm.name)
        self.assertFalse(client_messages.data["messages"][1]["is_forwarded"])

        self.api.force_authenticate(user=self.lawyer_user)
        lawyer_thread = self.api.get(
            reverse("communication-case-lawyer-thread", kwargs={"case_id": self.case.id}),
        )
        self.assertEqual(lawyer_thread.status_code, 200, lawyer_thread.data)
        lawyer_thread_messages = self.api.get(
            reverse(
                "communication-thread-messages",
                kwargs={"thread_id": lawyer_thread.data["thread"]["id"]},
            ),
        )
        self.assertEqual(lawyer_thread_messages.status_code, 200, lawyer_thread_messages.data)
        self.assertEqual(len(lawyer_thread_messages.data["messages"]), 1)
        self.assertTrue(lawyer_thread_messages.data["messages"][0]["is_forwarded"])

        internal_reply = self.api.post(
            reverse(
                "communication-thread-messages",
                kwargs={"thread_id": lawyer_thread.data["thread"]["id"]},
            ),
            {"body": "Tell the plaintiff the hearing date is Friday."},
            format="json",
        )
        self.assertEqual(internal_reply.status_code, 201, internal_reply.data)

        lawyer_read = self.api.get(
            reverse("communication-case-messages", kwargs={"case_id": self.case.id}),
        )
        self.assertEqual(lawyer_read.status_code, 200)
        self.assertEqual(len(lawyer_read.data["messages"]), 3)

        lawyer_reply = self.api.post(
            reverse("communication-case-messages", kwargs={"case_id": self.case.id}),
            {"body": "Lawyer should not be able to reply here."},
            format="json",
        )
        self.assertEqual(lawyer_reply.status_code, 403)

        self.api.force_authenticate(user=self.secretary_user)
        forward_to_client = self.api.post(
            reverse(
                "communication-message-forward-client",
                kwargs={"message_id": internal_reply.data["message"]["id"]},
            ),
            format="json",
        )
        self.assertEqual(forward_to_client.status_code, 201, forward_to_client.data)
        self.assertFalse(forward_to_client.data["message"]["is_forwarded"])

        self.api.force_authenticate(user=self.client_user)
        client_after_forward = self.api.get(
            reverse("communication-case-messages", kwargs={"case_id": self.case.id}),
        )
        self.assertEqual(client_after_forward.status_code, 200, client_after_forward.data)
        forwarded_client_message = client_after_forward.data["messages"][-1]
        self.assertEqual(forwarded_client_message["sender"]["role"], "FIRM")
        self.assertFalse(forwarded_client_message["is_forwarded"])
        self.assertEqual(forwarded_client_message["forward_direction"], "")

        self.api.force_authenticate(user=self.other_lawyer_user)
        other_lawyer_read = self.api.get(
            reverse("communication-case-messages", kwargs={"case_id": self.case.id}),
        )
        self.assertEqual(other_lawyer_read.status_code, 404)

    def test_secretary_case_lawyer_thread_is_only_for_assigned_lawyer(self):
        self.api.force_authenticate(user=self.secretary_user)
        response = self.api.get(
            reverse("communication-case-lawyer-thread", kwargs={"case_id": self.case.id}),
        )
        self.assertEqual(response.status_code, 200, response.data)
        thread = response.data["thread"]
        self.assertEqual(thread["thread_type"], "DIRECT_STAFF")
        self.assertEqual(thread["case"]["id"], str(self.case.id))

        participant_emails = {
            participant["user"]["email"] for participant in thread["participants"]
        }
        self.assertEqual(
            participant_emails,
            {self.secretary_user.email, self.lawyer_user.email},
        )

        secretary_message = self.api.post(
            reverse("communication-thread-messages", kwargs={"thread_id": thread["id"]}),
            {"body": "Please review this case update."},
            format="json",
        )
        self.assertEqual(secretary_message.status_code, 201, secretary_message.data)

        self.api.force_authenticate(user=self.lawyer_user)
        lawyer_messages = self.api.get(
            reverse("communication-thread-messages", kwargs={"thread_id": thread["id"]}),
        )
        self.assertEqual(lawyer_messages.status_code, 200, lawyer_messages.data)
        self.assertEqual(len(lawyer_messages.data["messages"]), 1)

        lawyer_thread_response = self.api.get(
            reverse("communication-case-lawyer-thread", kwargs={"case_id": self.case.id}),
        )
        self.assertEqual(lawyer_thread_response.status_code, 200, lawyer_thread_response.data)
        self.assertEqual(lawyer_thread_response.data["thread"]["id"], thread["id"])

        lawyer_reply = self.api.post(
            reverse("communication-thread-messages", kwargs={"thread_id": thread["id"]}),
            {"body": "Reviewed. I will handle it."},
            format="json",
        )
        self.assertEqual(lawyer_reply.status_code, 201, lawyer_reply.data)

        self.api.force_authenticate(user=self.other_lawyer_user)
        other_lawyer_read = self.api.get(
            reverse("communication-thread-messages", kwargs={"thread_id": thread["id"]}),
        )
        self.assertEqual(other_lawyer_read.status_code, 404)
