from datetime import timedelta

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.cases.models import Case, CaseEvent
from apps.clients.models import Client
from apps.common.choices import FirmRole, UserRole
from apps.firm.models import LawFirm, LawFirmMember
from apps.notifications.models import Notification
from apps.staff.models import Lawyer, Secretary
from apps.users.models import User


class VirtualCourtroomTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.admin = User.objects.create_user(
            email="courtroom-admin@example.com",
            password="strong-pass123",
            first_name="Court",
            last_name="Admin",
            phone_number="+254766000001",
            national_id_number="766000001",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(
            name="Courtroom Firm",
            registration_number="COURTROOM-001",
            owner=self.admin,
        )

        self.lawyer_user = User.objects.create_user(
            email="courtroom-lawyer@example.com",
            password="strong-pass123",
            first_name="Court",
            last_name="Lawyer",
            phone_number="+254766000002",
            national_id_number="766000002",
            role=UserRole.STAFF,
        )
        self.lawyer = Lawyer.objects.create(
            user=self.lawyer_user,
            law_firm=self.firm,
            staff_number="LAW-COURT-001",
            admission_number="ADV-COURT-001",
            date_hired=timezone.localdate(),
        )
        LawFirmMember.objects.create(
            firm=self.firm,
            user=self.lawyer_user,
            role=FirmRole.LAWYER,
            created_by=self.admin,
        )

        self.other_lawyer_user = User.objects.create_user(
            email="courtroom-other-lawyer@example.com",
            password="strong-pass123",
            first_name="Other",
            last_name="Lawyer",
            phone_number="+254766000003",
            national_id_number="766000003",
            role=UserRole.STAFF,
        )
        self.other_lawyer = Lawyer.objects.create(
            user=self.other_lawyer_user,
            law_firm=self.firm,
            staff_number="LAW-COURT-002",
            admission_number="ADV-COURT-002",
            date_hired=timezone.localdate(),
        )
        LawFirmMember.objects.create(
            firm=self.firm,
            user=self.other_lawyer_user,
            role=FirmRole.LAWYER,
            created_by=self.admin,
        )

        self.secretary_user = User.objects.create_user(
            email="courtroom-secretary@example.com",
            password="strong-pass123",
            first_name="Court",
            last_name="Secretary",
            phone_number="+254766000004",
            national_id_number="766000004",
            role=UserRole.STAFF,
        )
        self.secretary = Secretary.objects.create(
            user=self.secretary_user,
            law_firm=self.firm,
            staff_number="SEC-COURT-001",
            date_hired=timezone.localdate(),
        )
        self.secretary.assigned_lawyers.add(self.lawyer)
        LawFirmMember.objects.create(
            firm=self.firm,
            user=self.secretary_user,
            role=FirmRole.SECRETARY,
            created_by=self.admin,
        )

        self.client_user = User.objects.create_user(
            email="courtroom-client@example.com",
            password="strong-pass123",
            first_name="Court",
            last_name="Client",
            phone_number="+254766000005",
            national_id_number="766000005",
            role=UserRole.OFFICIAL_CLIENT,
        )
        self.client = Client.objects.create(
            firm=self.firm,
            user=self.client_user,
            created_by=self.admin,
            full_name="Court Client",
            email=self.client_user.email,
            phone_number=self.client_user.phone_number,
            national_id=self.client_user.national_id_number,
            client_type=Client.ClientType.INDIVIDUAL,
            lifecycle_status=Client.LifecycleStatus.OFFICIAL_CLIENT,
        )
        self.case = Case.objects.create(
            firm=self.firm,
            client=self.client,
            created_by=self.admin,
            case_number="COURT-001",
            title="Virtual Court Matter",
            case_type=Case.CaseType.CIVIL,
            court_type=Case.CourtType.HIGH_COURT,
            assigned_lawyer=self.lawyer,
            assigned_secretary=self.secretary,
        )

    def test_admin_creates_virtual_courtroom_event_visible_to_assigned_users(self):
        self.api.force_authenticate(user=self.admin)
        starts_at = timezone.now() + timedelta(hours=1)
        response = self.api.post(
            reverse("case-event-list-create", kwargs={"case_id": self.case.id}),
            {
                "event_type": CaseEvent.EventType.HEARING,
                "title": "Hearing",
                "starts_at": starts_at.isoformat(),
                "court_station": "Milimani",
                "courtroom": "Virtual Court 3",
                "virtual_courtroom_url": "https://court.example.test/live",
                "virtual_courtroom_label": "Milimani virtual courtroom",
                "is_virtual_courtroom_enabled": True,
                "is_client_visible": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        event_id = response.data["event"]["id"]
        self.assertTrue(response.data["event"]["virtual_courtroom_is_available"])
        self.assertEqual(
            Notification.objects.filter(
                notification_type=Notification.NotificationType.COURTROOM_LINK,
                case=self.case,
            ).count(),
            3,
        )

        self.api.force_authenticate(user=self.lawyer_user)
        lawyer_today = self.api.get(reverse("virtual-courtroom-today"))
        self.assertEqual(lawyer_today.status_code, 200, lawyer_today.data)
        self.assertEqual(lawyer_today.data["events"][0]["id"], event_id)

        self.api.force_authenticate(user=self.client_user)
        client_today = self.api.get(reverse("virtual-courtroom-today"))
        self.assertEqual(client_today.status_code, 200, client_today.data)
        self.assertEqual(client_today.data["events"][0]["virtual_courtroom_url"], "https://court.example.test/live")

        self.api.force_authenticate(user=self.other_lawyer_user)
        other_today = self.api.get(reverse("virtual-courtroom-today"))
        self.assertEqual(other_today.status_code, 200, other_today.data)
        self.assertEqual(other_today.data["events"], [])

    def test_secretary_can_update_assigned_case_courtroom_link(self):
        event = CaseEvent.objects.create(
            case=self.case,
            event_type=CaseEvent.EventType.MENTION,
            title="Mention",
            starts_at=timezone.now() + timedelta(hours=2),
            is_client_visible=True,
            created_by=self.admin,
        )

        self.api.force_authenticate(user=self.secretary_user)
        response = self.api.patch(
            reverse("virtual-courtroom-link-update", kwargs={"event_id": event.id}),
            {
                "virtual_courtroom_url": "https://court.example.test/mention",
                "virtual_courtroom_label": "Mention room",
                "is_virtual_courtroom_enabled": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["event"]["virtual_courtroom_url"], "https://court.example.test/mention")
        self.assertEqual(
            Notification.objects.filter(
                notification_type=Notification.NotificationType.COURTROOM_LINK,
                case=self.case,
            ).count(),
            3,
        )
