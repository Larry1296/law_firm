from datetime import timedelta

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.cases.models import Case, CaseEvent
from apps.clients.models import Client
from apps.common.choices import FirmRole, UserRole
from apps.courtroom.models import CourtroomAttendanceLog, CourtroomProvider, CourtroomRecording, CourtroomSession
from apps.firm.models import LawFirm, LawFirmMember
from apps.staff.models import Lawyer
from apps.users.models import User


class CourtroomApiTests(TestCase):
    def setUp(self):
        self.api = APIClient()
        self.admin = User.objects.create_user(
            email="courtops-admin@example.com",
            password="strong-pass123",
            first_name="Court",
            last_name="Owner",
            phone_number="+254744000001",
            national_id_number="744000001",
            role=UserRole.ADMIN,
        )
        self.firm = LawFirm.objects.create(
            name="CourtOps Firm",
            registration_number="COURTOPS-001",
            owner=self.admin,
        )
        self.lawyer_user = User.objects.create_user(
            email="courtops-lawyer@example.com",
            password="strong-pass123",
            first_name="Law",
            last_name="User",
            phone_number="+254744000002",
            national_id_number="744000002",
            role=UserRole.STAFF,
        )
        self.lawyer = Lawyer.objects.create(
            user=self.lawyer_user,
            law_firm=self.firm,
            staff_number="LAW-OPS-001",
            admission_number="ADV-OPS-001",
            date_hired=timezone.localdate(),
        )
        LawFirmMember.objects.create(
            firm=self.firm,
            user=self.lawyer_user,
            role=FirmRole.LAWYER,
            created_by=self.admin,
        )
        self.client_user = User.objects.create_user(
            email="courtops-client@example.com",
            password="strong-pass123",
            first_name="Client",
            last_name="User",
            phone_number="+254744000003",
            national_id_number="744000003",
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
            case_number="OPS-001",
            title="Courtroom Operations Matter",
            case_type=Case.CaseType.CIVIL,
            court_type=Case.CourtType.HIGH_COURT,
            assigned_lawyer=self.lawyer,
        )
        self.event = CaseEvent.objects.create(
            case=self.case,
            event_type=CaseEvent.EventType.HEARING,
            title="Virtual court appearance",
            starts_at=timezone.now() + timedelta(hours=1),
            virtual_courtroom_url="https://court.example.test/session",
            is_virtual_courtroom_enabled=True,
            is_client_visible=True,
            created_by=self.admin,
        )

    def test_admin_manages_provider_session_attendance_recording_and_analytics(self):
        self.api.force_authenticate(user=self.admin)

        provider_response = self.api.post(
            reverse("courtroom-provider-list-create"),
            {
                "name": "Milimani Virtual Court",
                "provider_type": CourtroomProvider.ProviderType.JUDICIARY,
                "base_url": "https://court.example.test",
                "is_default": True,
            },
            format="json",
        )
        self.assertEqual(provider_response.status_code, 201, provider_response.data)

        session_response = self.api.post(
            reverse("courtroom-session-list-create"),
            {
                "event_id": str(self.event.id),
                "provider": provider_response.data["id"],
                "join_url": "https://court.example.test/session",
                "status": CourtroomSession.Status.WAITING,
                "allow_recording_downloads": True,
            },
            format="json",
        )
        self.assertEqual(session_response.status_code, 201, session_response.data)
        session_id = session_response.data["id"]

        attendance_response = self.api.post(
            reverse("courtroom-attendance", kwargs={"session_id": session_id}),
            {
                "attendee_name": "Advocate One",
                "attendee_email": "advocate@example.test",
                "attendee_role": CourtroomAttendanceLog.AttendanceRole.LAWYER,
                "status": CourtroomAttendanceLog.AttendanceStatus.JOINED,
            },
            format="json",
        )
        self.assertEqual(attendance_response.status_code, 201, attendance_response.data)

        recording_response = self.api.post(
            reverse("courtroom-recordings", kwargs={"session_id": session_id}),
            {
                "title": "Morning proceedings",
                "recording_url": "https://recordings.example.test/ops-001",
                "download_url": "https://recordings.example.test/ops-001/download",
                "status": CourtroomRecording.RecordingStatus.READY,
                "is_downloadable": True,
            },
            format="json",
        )
        self.assertEqual(recording_response.status_code, 201, recording_response.data)

        analytics_response = self.api.get(reverse("courtroom-analytics"))
        self.assertEqual(analytics_response.status_code, 200, analytics_response.data)
        self.assertEqual(analytics_response.data["today_sessions"], 1)
        self.assertEqual(analytics_response.data["attendance_logs"], 1)
        self.assertEqual(analytics_response.data["recorded_sessions"], 1)

    def test_assigned_lawyer_can_view_session_but_not_create_provider(self):
        provider = CourtroomProvider.objects.create(
            firm=self.firm,
            name="Judiciary",
            provider_type=CourtroomProvider.ProviderType.JUDICIARY,
            created_by=self.admin,
        )
        CourtroomSession.objects.create(
            event=self.event,
            provider=provider,
            join_url="https://court.example.test/session",
            created_by=self.admin,
        )

        self.api.force_authenticate(user=self.lawyer_user)
        list_response = self.api.get(reverse("courtroom-session-list-create"), {"scope": "today"})
        self.assertEqual(list_response.status_code, 200, list_response.data)
        self.assertEqual(len(list_response.data), 1)

        provider_response = self.api.post(
            reverse("courtroom-provider-list-create"),
            {"name": "Unauthorized Provider", "provider_type": CourtroomProvider.ProviderType.OTHER},
            format="json",
        )
        self.assertEqual(provider_response.status_code, 403)

    def test_client_case_id_filter_returns_only_that_case_session(self):
        provider = CourtroomProvider.objects.create(
            firm=self.firm,
            name="Judiciary",
            provider_type=CourtroomProvider.ProviderType.JUDICIARY,
            created_by=self.admin,
        )
        CourtroomSession.objects.create(
            event=self.event,
            provider=provider,
            join_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            created_by=self.admin,
        )

        other_case = Case.objects.create(
            firm=self.firm,
            client=self.client,
            created_by=self.admin,
            case_number="OPS-002",
            title="Second Courtroom Matter",
            case_type=Case.CaseType.CIVIL,
            court_type=Case.CourtType.HIGH_COURT,
            assigned_lawyer=self.lawyer,
        )
        other_event = CaseEvent.objects.create(
            case=other_case,
            event_type=CaseEvent.EventType.MENTION,
            title="Second appearance",
            starts_at=timezone.now() + timedelta(hours=2),
            virtual_courtroom_url="https://video.example.test/second.mp4",
            is_virtual_courtroom_enabled=True,
            is_client_visible=True,
            created_by=self.admin,
        )
        CourtroomSession.objects.create(
            event=other_event,
            provider=provider,
            join_url="https://video.example.test/second.mp4",
            created_by=self.admin,
        )

        self.api.force_authenticate(user=self.client_user)
        response = self.api.get(
            reverse("courtroom-session-list-create"),
            {"case_id": str(self.case.id)},
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["event"]["case"]["id"], str(self.case.id))
        self.assertEqual(response.data[0]["join_url"], "https://www.youtube.com/watch?v=dQw4w9WgXcQ")
