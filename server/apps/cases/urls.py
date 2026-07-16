from django.urls import path

from apps.cases.views import (
    CaseDetailView,
    CaseEventListCreateView,
    CaseListCreateView,
    CaseReassignLawyerView,
    CaseReassignSecretaryView,
    CaseStatusView,
    VirtualCourtroomLinkUpdateView,
    VirtualCourtroomTodayView,
)

urlpatterns = [
    path("", CaseListCreateView.as_view(), name="case-list"),
    path("create/", CaseListCreateView.as_view(), name="case-create"),
    path("courtroom/today/", VirtualCourtroomTodayView.as_view(), name="virtual-courtroom-today"),
    path("events/<uuid:event_id>/courtroom-link/", VirtualCourtroomLinkUpdateView.as_view(), name="virtual-courtroom-link-update"),
    path("<uuid:case_id>/", CaseDetailView.as_view(), name="case-detail"),
    path("<uuid:case_id>/events/", CaseEventListCreateView.as_view(), name="case-event-list-create"),
    path("<uuid:case_id>/status/", CaseStatusView.as_view(), name="case-status"),
    path("<uuid:case_id>/reassign-lawyer/", CaseReassignLawyerView.as_view(), name="case-reassign-lawyer"),
    path("<uuid:case_id>/reassign-secretary/", CaseReassignSecretaryView.as_view(), name="case-reassign-secretary"),
]
