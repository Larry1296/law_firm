from datetime import timedelta

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.cases.models import Case, CaseEvent
from apps.clients.models import Client
from apps.common.choices import FirmRole, UserRole
from apps.events.models import EventClientAwareness
from apps.firm.models import LawFirm, LawFirmMember
from apps.notifications.models import Notification
from apps.staff.models import Lawyer, Secretary
from apps.users.models import User


class EventApiTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.admin = User.objects.create_user(
            email="events-admin@example.com",
            password="strong-pass123",
            first_name="Event",
            last_name="Admin",
            phone_number="+254733000001",
            national_id_number="733000001",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(
            name="Events Firm",
            registration_number="EVENTS-001",
            owner=self.admin,
        )
        self.lawyer_user = User.objects.create_user(
            email="events-lawyer@example.com",
            password="strong-pass123",
            first_name="Event",
            last_name="Lawyer",
            phone_number="+254733000002",
            national_id_number="733000002",
            role=UserRole.STAFF,
        )
        self.lawyer = Lawyer.objects.create(
            user=self.lawyer_user,
            law_firm=self.firm,
            staff_number="LAW-EVT-001",
            admission_number="ADV-EVT-001",
            date_hired=timezone.localdate(),
        )
        LawFirmMember.objects.create(
            firm=self.firm,
            user=self.lawyer_user,
            role=FirmRole.LAWYER,
            created_by=self.admin,
        )
        self.secretary_user = User.objects.create_user(
            email="events-secretary@example.com",
            password="strong-pass123",
            first_name="Event",
            last_name="Secretary",
            phone_number="+254733000003",
            national_id_number="733000003",
            role=UserRole.STAFF,
        )
        self.secretary = Secretary.objects.create(
            user=self.secretary_user,
            law_firm=self.firm,
            staff_number="SEC-EVT-001",
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
            email="events-client@example.com",
            password="strong-pass123",
            first_name="Event",
            last_name="Client",
            phone_number="+254733000004",
            national_id_number="733000004",
            role=UserRole.OFFICIAL_CLIENT,
        )
        self.client = Client.objects.create(
            firm=self.firm,
            user=self.client_user,
            created_by=self.admin,
            full_name="Event Client",
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
            case_number="EVT-001",
            title="Events Matter",
            case_type=Case.CaseType.CIVIL,
            court_type=Case.CourtType.HIGH_COURT,
            assigned_lawyer=self.lawyer,
            assigned_secretary=self.secretary,
        )

    def test_event_creation_notifies_affected_parties_and_marks_client_notified(self):
        self.api.force_authenticate(user=self.admin)
        response = self.api.post(
            reverse("event-list-create"),
            {
                "case_id": str(self.case.id),
                "event_type": CaseEvent.EventType.HEARING,
                "title": "Court appearance",
                "starts_at": (timezone.now() + timedelta(hours=2)).isoformat(),
                "court_station": "Milimani",
                "courtroom": "Court 1",
                "is_client_visible": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        event_id = response.data["event"]["id"]
        self.assertEqual(
            Notification.objects.filter(
                notification_type=Notification.NotificationType.CASE_EVENT,
                case=self.case,
            ).count(),
            3,
        )
        awareness = EventClientAwareness.objects.get(event_id=event_id)
        self.assertEqual(awareness.status, EventClientAwareness.AwarenessStatus.NOTIFIED)
        self.assertIsNotNone(awareness.notified_at)

    def test_client_sees_only_visible_upcoming_events(self):
        visible = CaseEvent.objects.create(
            case=self.case,
            event_type=CaseEvent.EventType.MENTION,
            title="Visible mention",
            starts_at=timezone.now() + timedelta(days=1),
            is_client_visible=True,
            created_by=self.admin,
        )
        CaseEvent.objects.create(
            case=self.case,
            event_type=CaseEvent.EventType.CLIENT_MEETING,
            title="Internal prep",
            starts_at=timezone.now() + timedelta(days=1),
            is_client_visible=False,
            created_by=self.admin,
        )

        self.api.force_authenticate(user=self.client_user)
        response = self.api.get(reverse("event-list-create"), {"scope": "upcoming"})

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual([event["id"] for event in response.data["events"]], [str(visible.id)])

    def test_secretary_can_confirm_client_awareness(self):
        event = CaseEvent.objects.create(
            case=self.case,
            event_type=CaseEvent.EventType.HEARING,
            title="Awareness hearing",
            starts_at=timezone.now() + timedelta(days=1),
            is_client_visible=True,
            created_by=self.admin,
        )

        self.api.force_authenticate(user=self.secretary_user)
        response = self.api.patch(
            reverse("event-awareness", kwargs={"event_id": event.id}),
            {
                "status": EventClientAwareness.AwarenessStatus.CONFIRMED,
                "confirmation_channel": "phone",
                "notes": "Client confirmed attendance.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        awareness = EventClientAwareness.objects.get(event=event)
        self.assertEqual(awareness.status, EventClientAwareness.AwarenessStatus.CONFIRMED)
        self.assertEqual(awareness.confirmation_channel, "phone")
        self.assertIsNotNone(awareness.confirmed_at)
