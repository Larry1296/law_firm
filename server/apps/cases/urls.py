from django.urls import path

from apps.cases.views import (
    CaseConflictCheckActionView,
    CaseConflictCheckView,
    CaseDetailView,
    CaseEventListCreateView,
    CaseJurisdictionVerificationView,
    CaseListCreateView,
    CaseLifecycleTransitionView,
    CaseReassignLawyerView,
    CaseReassignSecretaryView,
    CaseStatusView,
    VirtualCourtroomLinkUpdateView,
    VirtualCourtroomTodayView,
)

urlpatterns = [
    path("", CaseListCreateView.as_view(), name="case-list"),
    path("open/", CaseListCreateView.as_view(), name="case-create"),
    path("courtroom/today/", VirtualCourtroomTodayView.as_view(), name="virtual-courtroom-today"),
    path("events/<uuid:event_id>/courtroom-link/", VirtualCourtroomLinkUpdateView.as_view(), name="virtual-courtroom-link-update"),
    path("<uuid:case_id>/", CaseDetailView.as_view(), name="case-detail"),
    path("<uuid:case_id>/events/", CaseEventListCreateView.as_view(), name="case-event-list-create"),
    path("<uuid:case_id>/transitions/", CaseLifecycleTransitionView.as_view(), name="case-lifecycle-transition"),
    path("<uuid:case_id>/conflict-check/", CaseConflictCheckView.as_view(), name="case-conflict-check"),
    path("<uuid:case_id>/conflict-check/actions/", CaseConflictCheckActionView.as_view(), name="case-conflict-check-action"),
    path("<uuid:case_id>/jurisdiction/actions/", CaseJurisdictionVerificationView.as_view(), name="case-jurisdiction-action"),
    path("<uuid:case_id>/status/", CaseStatusView.as_view(), name="case-status"),
    path("<uuid:case_id>/reassign-lawyer/", CaseReassignLawyerView.as_view(), name="case-reassign-lawyer"),
    path("<uuid:case_id>/reassign-secretary/", CaseReassignSecretaryView.as_view(), name="case-reassign-secretary"),
]
