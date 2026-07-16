from django.urls import path

from apps.courtroom.views import (
    CourtroomAnalyticsView,
    CourtroomAttendanceListCreateView,
    CourtroomCauseListSyncListCreateView,
    CourtroomProviderDetailView,
    CourtroomProviderListCreateView,
    CourtroomRecordingDownloadView,
    CourtroomRecordingListCreateView,
    CourtroomSessionDetailView,
    CourtroomSessionListCreateView,
)

urlpatterns = [
    path("providers/", CourtroomProviderListCreateView.as_view(), name="courtroom-provider-list-create"),
    path("providers/<uuid:pk>/", CourtroomProviderDetailView.as_view(), name="courtroom-provider-detail"),
    path("sessions/", CourtroomSessionListCreateView.as_view(), name="courtroom-session-list-create"),
    path("sessions/<uuid:pk>/", CourtroomSessionDetailView.as_view(), name="courtroom-session-detail"),
    path("sessions/<uuid:session_id>/attendance/", CourtroomAttendanceListCreateView.as_view(), name="courtroom-attendance"),
    path("sessions/<uuid:session_id>/recordings/", CourtroomRecordingListCreateView.as_view(), name="courtroom-recordings"),
    path("recordings/<uuid:recording_id>/download/", CourtroomRecordingDownloadView.as_view(), name="courtroom-recording-download"),
    path("cause-list-syncs/", CourtroomCauseListSyncListCreateView.as_view(), name="courtroom-cause-list-syncs"),
    path("analytics/", CourtroomAnalyticsView.as_view(), name="courtroom-analytics"),
]
