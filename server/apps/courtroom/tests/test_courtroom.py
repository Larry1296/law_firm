from datetime import timedelta

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.cases.models import Case, CaseEvent
from apps.clients.models import Client
from apps.common.choices import FirmRole, UserRole
from apps.courtroom.models import CourtRecordingPermission, CourtroomAttendanceLog, CourtroomProvider, CourtroomRecording, CourtroomSession
from apps.firm.models import LawFirm, LawFirmMember
from apps.notifications.models import Notification
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

    def start_event_now(self):
        # "Today" scopes compare calendar dates; an hour ahead can cross midnight.
        self.event.starts_at = timezone.now()
        self.event.save(update_fields=["starts_at", "updated_at"])

    def test_admin_manages_provider_session_attendance_recording_and_analytics(self):
        self.start_event_now()
        self.api.force_authenticate(user=self.admin)

        provider_response = self.api.post(
            reverse("courtroom-provider-list-create"),
            {
                "name": "Milimani Virtual Court",
                "provider_type": CourtroomProvider.ProviderType.ZOOM,
                "base_url": "https://zoom.us",
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
                "join_url": "https://zoom.us/j/123456789",
                "status": CourtroomSession.Status.WAITING,
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
                "status": CourtroomAttendanceLog.AttendanceStatus.JOIN_CONFIRMED,
            },
            format="json",
        )
        self.assertEqual(attendance_response.status_code, 201, attendance_response.data)

        session = CourtroomSession.objects.get(id=session_id)
        CourtRecordingPermission.objects.create(session=session, permission_status=CourtRecordingPermission.Status.GRANTED, granted_by="Presiding court", granted_at=timezone.now(), audio_allowed=True)
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
        self.start_event_now()
        provider = CourtroomProvider.objects.create(
            firm=self.firm,
            name="Judiciary",
            provider_type=CourtroomProvider.ProviderType.ZOOM,
            created_by=self.admin,
        )
        CourtroomSession.objects.create(
            event=self.event,
            provider=provider,
            join_url="https://zoom.us/j/123456789",
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
            provider_type=CourtroomProvider.ProviderType.YOUTUBE_LIVE,
            created_by=self.admin,
        )
        CourtroomSession.objects.create(
            event=self.event,
            provider=provider,
            join_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            client_access_enabled=True,
            client_attendance_requirement=CourtroomSession.ClientAttendance.OPTIONAL,
            client_access_from=timezone.now() - timedelta(minutes=5),
            client_access_until=timezone.now() + timedelta(hours=2),
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
        self.assertEqual(response.data[0]["event_summary"]["case_id"], str(self.case.id))
        self.assertNotIn("join_url", response.data[0])


class AdvocateCourtLinkTests(TestCase):
    """The assigned advocate pastes the court link; the client is notified and joins from their dashboard."""

    setUp = CourtroomApiTests.setUp

    def post_link(self, user, **overrides):
        self.api.force_authenticate(user=user)
        payload = {
            "event_id": str(self.event.id),
            "join_url": "https://teams.microsoft.com/l/meetup-join/abc",
            "link_source": CourtroomSession.LinkSource.CAUSE_LIST,
            "link_verified": True,
            **overrides,
        }
        return self.api.post(reverse("courtroom-session-list-create"), payload, format="json")

    def client_link_notifications(self):
        return Notification.objects.filter(
            recipient=self.client_user,
            notification_type=Notification.NotificationType.COURTROOM_LINK,
        )

    def test_assigned_advocate_adds_link_and_client_access_opens_around_sitting(self):
        response = self.post_link(self.lawyer_user)
        self.assertEqual(response.status_code, 201, response.data)

        session = CourtroomSession.objects.get(id=response.data["id"])
        self.assertEqual(session.responsible_advocate, self.lawyer)
        self.assertTrue(session.link_verified)
        self.assertEqual(session.link_verified_by, self.lawyer_user)
        self.assertEqual(session.client_attendance_requirement, CourtroomSession.ClientAttendance.OPTIONAL)
        self.assertTrue(session.client_access_enabled)
        self.assertEqual(session.client_access_from, self.event.starts_at - timedelta(minutes=30))
        self.assertEqual(session.client_access_until, self.event.starts_at + timedelta(minutes=120))

        self.event.refresh_from_db()
        self.assertEqual(self.event.virtual_courtroom_url, session.join_url)

        notification = self.client_link_notifications().get()
        self.assertEqual(notification.action_url, f"/client/cases/{self.case.id}")
        self.assertIn("Join button opens at", notification.message)
        self.assertFalse(Notification.objects.filter(recipient=self.lawyer_user).exists())

    def test_unassigned_advocate_and_client_cannot_add_link(self):
        other_user = User.objects.create_user(
            email="courtops-other@example.com",
            password="strong-pass123",
            first_name="Other",
            last_name="Advocate",
            phone_number="+254744000004",
            national_id_number="744000004",
            role=UserRole.STAFF,
        )
        Lawyer.objects.create(
            user=other_user,
            law_firm=self.firm,
            staff_number="LAW-OPS-002",
            admission_number="ADV-OPS-002",
            date_hired=timezone.localdate(),
        )
        self.assertEqual(self.post_link(other_user).status_code, 403)
        self.assertEqual(self.post_link(self.client_user).status_code, 403)
        self.assertFalse(CourtroomSession.objects.exists())

    def test_duplicate_session_for_same_court_date_is_rejected(self):
        self.assertEqual(self.post_link(self.lawyer_user).status_code, 201)
        response = self.post_link(self.lawyer_user, join_url="https://teams.microsoft.com/l/meetup-join/other")
        self.assertEqual(response.status_code, 400, response.data)

    def test_restricted_session_is_not_opened_or_announced_to_client(self):
        response = self.post_link(
            self.lawyer_user,
            client_attendance_requirement=CourtroomSession.ClientAttendance.RESTRICTED,
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertFalse(CourtroomSession.objects.get().client_access_enabled)
        self.assertFalse(self.client_link_notifications().exists())

    def test_changed_link_renotifies_and_requires_fresh_verification(self):
        session_id = self.post_link(self.lawyer_user).data["id"]
        response = self.api.patch(
            reverse("courtroom-session-detail", kwargs={"pk": session_id}),
            {"join_url": "https://teams.microsoft.com/l/meetup-join/replacement"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        session = CourtroomSession.objects.get(id=session_id)
        self.assertFalse(session.link_verified)
        self.assertIsNone(session.link_verified_by)
        self.assertEqual(self.client_link_notifications().count(), 2)

    def test_client_sees_session_before_window_but_can_join_only_inside_it(self):
        session_id = self.post_link(self.lawyer_user).data["id"]

        self.api.force_authenticate(user=self.client_user)
        listed = self.api.get(reverse("courtroom-session-list-create"), {"case_id": str(self.case.id)})
        self.assertEqual(listed.status_code, 200, listed.data)
        self.assertEqual(len(listed.data), 1)
        self.assertFalse(listed.data[0]["can_join"])
        self.assertNotIn("join_url", listed.data[0])

        launch_url = reverse("courtroom-launch-request", kwargs={"session_id": session_id})
        self.assertEqual(self.api.post(launch_url).status_code, 403)

        CourtroomSession.objects.filter(id=session_id).update(client_access_from=timezone.now() - timedelta(minutes=1))
        grant = self.api.post(launch_url)
        self.assertEqual(grant.status_code, 201, grant.data)
        opened = self.api.post(reverse("courtroom-launch-open", kwargs={"grant_id": grant.data["launch_token"]}))
        self.assertEqual(opened.status_code, 200, opened.data)
        self.assertEqual(opened.data["open_url"], "https://teams.microsoft.com/l/meetup-join/abc")
        self.assertTrue(
            CourtroomAttendanceLog.objects.filter(
                session_id=session_id,
                user=self.client_user,
                status=CourtroomAttendanceLog.AttendanceStatus.PROVIDER_OPENED,
            ).exists()
        )
