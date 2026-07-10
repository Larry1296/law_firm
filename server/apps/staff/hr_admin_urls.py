from django.urls import path

from apps.staff.views.admin.hr import (
    AdminHRActivateView,
    AdminHRChangeStatusView,
    AdminHRCreateView,
    AdminHRDeactivateView,
    AdminHRDeleteView,
    AdminHRDetailView,
    AdminHRListView,
    AdminHRPermissionView,
    AdminHRUpdateView,
)

urlpatterns = [
    path("", AdminHRListView.as_view(), name="admin-hr-list"),
    path("create/", AdminHRCreateView.as_view(), name="admin-hr-create"),
    path("<uuid:staff_id>/", AdminHRDetailView.as_view(), name="admin-hr-detail"),
    path("<uuid:staff_id>/update/", AdminHRUpdateView.as_view(), name="admin-hr-update"),
    path("<uuid:staff_id>/delete/", AdminHRDeleteView.as_view(), name="admin-hr-delete"),
    path("<uuid:staff_id>/activate/", AdminHRActivateView.as_view(), name="admin-hr-activate"),
    path("<uuid:staff_id>/deactivate/", AdminHRDeactivateView.as_view(), name="admin-hr-deactivate"),
    path("<uuid:staff_id>/change-status/", AdminHRChangeStatusView.as_view(), name="admin-hr-change-status"),
    path("<uuid:staff_id>/permissions/", AdminHRPermissionView.as_view(), name="admin-hr-permissions"),
]
