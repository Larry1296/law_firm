from django.http import FileResponse
from django.shortcuts import redirect
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.choices import UserRole
from apps.courtroom.models import (
    CourtroomAttendanceLog,
    CourtroomCauseListSync,
    CourtroomProvider,
    CourtroomRecording,
    CourtroomSession,
)
from apps.courtroom.serializers import (
    CourtroomAttendanceLogSerializer,
    CourtroomCauseListSyncSerializer,
    CourtroomProviderSerializer,
    CourtroomRecordingSerializer,
    CourtroomSessionSerializer,
)
from apps.courtroom.services import CourtroomService


class AdminRequiredMixin:
    def ensure_admin(self):
        if self.request.user.role != UserRole.ADMIN:
            raise PermissionDenied("Only firm administrators can manage courtroom configuration.")


class CourtroomProviderListCreateView(AdminRequiredMixin, generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CourtroomProviderSerializer

    def get_queryset(self):
        self.ensure_admin()
        return CourtroomService.providers_for_user(self.request.user)

    def perform_create(self, serializer):
        self.ensure_admin()
        firm = CourtroomService.firm_for_user(self.request.user)
        if not firm:
            raise ValidationError("No active firm found for this administrator.")
        provider = serializer.save(firm=firm, created_by=self.request.user)
        if provider.is_default:
            CourtroomProvider.objects.filter(firm=firm).exclude(id=provider.id).update(is_default=False)


class CourtroomProviderDetailView(AdminRequiredMixin, generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CourtroomProviderSerializer

    def get_queryset(self):
        self.ensure_admin()
        return CourtroomService.providers_for_user(self.request.user)

    def perform_update(self, serializer):
        provider = serializer.save()
        if provider.is_default:
            CourtroomProvider.objects.filter(firm=provider.firm).exclude(id=provider.id).update(is_default=False)


class CourtroomSessionListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CourtroomSessionSerializer

    def get_queryset(self):
        queryset = CourtroomService.sessions_for_user(self.request.user)
        scope = self.request.query_params.get("scope")
        case_id = self.request.query_params.get("case_id")
        if case_id:
            queryset = queryset.filter(event__case_id=case_id)
        if scope == "today":
            return queryset.filter(event__starts_at__date=timezone.localdate())
        return queryset

    def perform_create(self, serializer):
        if self.request.user.role != UserRole.ADMIN:
            raise PermissionDenied("Only firm administrators can create courtroom sessions.")
        event = serializer.validated_data["event"]
        if not CourtroomService.admin_case_events(self.request.user).filter(id=event.id).exists():
            raise PermissionDenied("This event is outside your firm.")
        session = serializer.save(created_by=self.request.user)
        CourtroomService.sync_event_link(session)


class CourtroomSessionDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CourtroomSessionSerializer

    def get_queryset(self):
        return CourtroomService.sessions_for_user(self.request.user)

    def perform_update(self, serializer):
        if self.request.user.role != UserRole.ADMIN:
            raise PermissionDenied("Only firm administrators can update courtroom sessions.")
        session = serializer.save()
        CourtroomService.sync_event_link(session)


class CourtroomAttendanceListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CourtroomAttendanceLogSerializer

    def get_session(self):
        return CourtroomService.get_scoped_session(self.request.user, self.kwargs["session_id"])

    def get_queryset(self):
        session = self.get_session()
        queryset = session.attendance_logs.select_related("user")
        if self.request.user.role != UserRole.ADMIN:
            return queryset.filter(user=self.request.user)
        return queryset

    def perform_create(self, serializer):
        session = self.get_session()
        user = self.request.user
        data = serializer.validated_data
        if user.role != UserRole.ADMIN:
            data["user"] = user
            data["attendee_name"] = user.full_name or user.email
            data["attendee_email"] = user.email
        serializer.save(session=session, **data)


class CourtroomCauseListSyncListCreateView(AdminRequiredMixin, generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CourtroomCauseListSyncSerializer

    def get_queryset(self):
        self.ensure_admin()
        firm = CourtroomService.firm_for_user(self.request.user)
        return CourtroomCauseListSync.objects.filter(firm=firm)

    def perform_create(self, serializer):
        self.ensure_admin()
        firm = CourtroomService.firm_for_user(self.request.user)
        serializer.save(firm=firm, created_by=self.request.user)


class CourtroomRecordingListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CourtroomRecordingSerializer

    def get_session(self):
        return CourtroomService.get_scoped_session(self.request.user, self.kwargs["session_id"])

    def get_queryset(self):
        session = self.get_session()
        queryset = session.recordings.all()
        if self.request.user.role != UserRole.ADMIN:
            queryset = queryset.filter(is_downloadable=True, status=CourtroomRecording.RecordingStatus.READY)
        return queryset

    def perform_create(self, serializer):
        if self.request.user.role != UserRole.ADMIN:
            raise PermissionDenied("Only firm administrators can add courtroom recordings.")
        serializer.save(session=self.get_session(), created_by=self.request.user)


class CourtroomRecordingDownloadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, recording_id):
        recording = generics.get_object_or_404(
            CourtroomRecording.objects.select_related("session"),
            id=recording_id,
            session__in=CourtroomService.sessions_for_user(request.user),
            is_downloadable=True,
            status=CourtroomRecording.RecordingStatus.READY,
        )
        if recording.file:
            return FileResponse(recording.file.open("rb"), as_attachment=True, filename=recording.file.name.split("/")[-1])
        target_url = recording.download_url or recording.recording_url
        if target_url:
            return redirect(target_url)
        return Response({"detail": "Recording is not available for download."}, status=status.HTTP_404_NOT_FOUND)


class CourtroomAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(CourtroomService.analytics(request.user))
