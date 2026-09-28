from django.urls import path

from apps.platform_admin import views

urlpatterns = [
    path("overview/", views.OverviewView.as_view(), name="platform-overview"),
    path("meta/", views.MetaView.as_view(), name="platform-meta"),

    path("firms/", views.FirmListCreateView.as_view(), name="platform-firms"),
    path("firms/<uuid:firm_id>/", views.FirmDetailView.as_view(), name="platform-firm-detail"),
    path("firms/<uuid:firm_id>/status/", views.FirmStatusView.as_view(), name="platform-firm-status"),
    path("firms/<uuid:firm_id>/subscription/", views.FirmSubscriptionView.as_view(), name="platform-firm-subscription"),
    path("firms/<uuid:firm_id>/owner-invitation/", views.FirmOwnerInvitationView.as_view(), name="platform-firm-owner-invitation"),
    path("firms/<uuid:firm_id>/logo/", views.FirmLogoUploadView.as_view(), name="platform-firm-logo"),

    path("plans/", views.PlanListCreateView.as_view(), name="platform-plans"),
    path("plans/<uuid:plan_id>/", views.PlanDetailView.as_view(), name="platform-plan-detail"),

    path("users/", views.UserListView.as_view(), name="platform-users"),
    path("users/<uuid:user_id>/", views.UserStatusView.as_view(), name="platform-user-status"),

    path("invoices/", views.InvoiceListView.as_view(), name="platform-invoices"),
    path("invoices/<uuid:invoice_id>/confirm/", views.InvoiceConfirmView.as_view(), name="platform-invoice-confirm"),
    path("invoices/<uuid:invoice_id>/void/", views.InvoiceVoidView.as_view(), name="platform-invoice-void"),

    path("onboarding-requests/", views.OnboardingRequestListView.as_view(), name="platform-onboarding-requests"),
    path("onboarding-requests/submit/", views.PublicOnboardingRequestView.as_view(), name="platform-onboarding-request-submit"),
    path("onboarding-requests/<uuid:request_id>/", views.OnboardingRequestDetailView.as_view(), name="platform-onboarding-request-detail"),
]
