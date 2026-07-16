from django.urls import path

from apps.events.views import (
    CaseEventListCreateView,
    EventAwarenessView,
    EventDetailView,
    EventListCreateView,
    VirtualCourtroomLinkUpdateView,
    VirtualCourtroomTodayView,
)

urlpatterns = [
    path("", EventListCreateView.as_view(), name="event-list-create"),
    path("courtroom/today/", VirtualCourtroomTodayView.as_view(), name="events-courtroom-today"),
    path("cases/<uuid:case_id>/", CaseEventListCreateView.as_view(), name="events-case-list-create"),
    path("<uuid:event_id>/awareness/", EventAwarenessView.as_view(), name="event-awareness"),
    path("<uuid:event_id>/courtroom-link/", VirtualCourtroomLinkUpdateView.as_view(), name="event-courtroom-link-update"),
    path("<uuid:event_id>/", EventDetailView.as_view(), name="event-detail"),
]
