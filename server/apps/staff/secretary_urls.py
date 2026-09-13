from apps.clients.views.walk_in_enquiry_view import (WalkInEnquiryListCreateView, WalkInPrivacyNoticeView, WalkInNoticeDeliveryView, WalkInEnquiryCorrectionView)
from django.urls import include, path
from apps.clients.views.onboarding_views import ClientOnboardingCreateView, ClientOnboardingMetadataView

from apps.staff.views.secretary import (
    SecretaryCalendarView,
    SecretaryCasesView,
    SecretaryChangePasswordView,
    SecretaryClientsView,
    SecretaryDashboardView,
    SecretaryDocumentsView,
    SecretaryDocumentVerificationView,
    SecretaryDocumentDispatchView,
    SecretaryPhysicalDocumentActionView,
    SecretaryNotificationsView,
    SecretaryProfileView,
    SecretaryTasksView,
    SecretaryCaseCreateOptionsView,
)

urlpatterns = [
    path("clients/walk-in-enquiries/privacy-notice/", WalkInPrivacyNoticeView.as_view(workspace="secretary"), name="secretary-walk-in-privacy-notice"),
    path("clients/walk-in-enquiries/notice-deliveries/", WalkInNoticeDeliveryView.as_view(workspace="secretary"), name="secretary-walk-in-notice-deliveries"),
    path("clients/walk-in-enquiries/<uuid:enquiry_id>/corrections/", WalkInEnquiryCorrectionView.as_view(workspace="secretary"), name="secretary-walk-in-corrections"),
    path("clients/walk-in-enquiries/", WalkInEnquiryListCreateView.as_view(workspace="secretary"), name="secretary-walk-in-enquiries"),
    path("clients/onboarding-metadata/", ClientOnboardingMetadataView.as_view(), name="secretary-client-onboarding-metadata"),
    path("clients/onboarding/", ClientOnboardingCreateView.as_view(), name="secretary-client-onboarding-create"),
    path("profile/", SecretaryProfileView.as_view(), name="secretary-profile"),
    path("dashboard/", SecretaryDashboardView.as_view(), name="secretary-dashboard"),
    path("clients/", SecretaryClientsView.as_view(), name="secretary-clients"),
    path(
        "clients/<str:client_type>/create/",
        SecretaryClientsView.as_view(),
        name="secretary-client-create",
    ),
    path("cases/", SecretaryCasesView.as_view(), name="secretary-cases"),
    path("cases/create-options/", SecretaryCaseCreateOptionsView.as_view(), name="secretary-case-create-options"),
    path("cases/<uuid:case_id>/", SecretaryCasesView.as_view(), name="secretary-case-detail"),
    path("documents/", SecretaryDocumentsView.as_view(), name="secretary-documents"),
    path("documents/requests/<uuid:request_id>/verify/", SecretaryDocumentVerificationView.as_view(), name="secretary-document-verify"),
    path("documents/requests/<uuid:request_id>/dispatch/", SecretaryDocumentDispatchView.as_view(), name="secretary-document-dispatch"),
    path("documents/<str:document_id>/actions/", SecretaryPhysicalDocumentActionView.as_view(), name="secretary-physical-document-actions"),
    path("tasks/", SecretaryTasksView.as_view(), name="secretary-tasks"),
    path("calendar/", SecretaryCalendarView.as_view(), name="secretary-calendar"),
    path("notifications/", SecretaryNotificationsView.as_view(), name="secretary-notifications"),
    path("communications/", include("apps.communications.secretary_urls")),
    path("change-password/", SecretaryChangePasswordView.as_view(), name="secretary-change-password"),
]
