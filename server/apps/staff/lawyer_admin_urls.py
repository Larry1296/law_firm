from django.urls import path

from apps.staff.views.admin.lawyers import (
    AdminLawyerActivateView,
    AdminLawyerChangeStatusView,
    AdminLawyerCreateView,
    AdminLawyerDeactivateView,
    AdminLawyerDeleteView,
    AdminLawyerDetailView,
    AdminLawyerListView,
    AdminLawyerPermissionView,
    AdminLawyerUpdateView,
)

urlpatterns = [
    path("", AdminLawyerListView.as_view(), name="admin-lawyer-list"),
    path("create/", AdminLawyerCreateView.as_view(), name="admin-lawyer-create"),
    path("<uuid:lawyer_id>/", AdminLawyerDetailView.as_view(), name="admin-lawyer-detail"),
    path("<uuid:lawyer_id>/update/", AdminLawyerUpdateView.as_view(), name="admin-lawyer-update"),
    path("<uuid:lawyer_id>/delete/", AdminLawyerDeleteView.as_view(), name="admin-lawyer-delete"),
    path("<uuid:lawyer_id>/activate/", AdminLawyerActivateView.as_view(), name="admin-lawyer-activate"),
    path("<uuid:lawyer_id>/deactivate/", AdminLawyerDeactivateView.as_view(), name="admin-lawyer-deactivate"),
    path(
        "<uuid:lawyer_id>/change-status/",
        AdminLawyerChangeStatusView.as_view(),
        name="admin-lawyer-change-status",
    ),
    path(
        "<uuid:lawyer_id>/permissions/",
        AdminLawyerPermissionView.as_view(),
        name="admin-lawyer-permissions",
    ),
]
