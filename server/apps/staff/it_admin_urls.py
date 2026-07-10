from django.urls import path

from apps.staff.views.admin.it import (
    AdminITActivateView,
    AdminITChangeStatusView,
    AdminITCreateView,
    AdminITDeactivateView,
    AdminITDeleteView,
    AdminITDetailView,
    AdminITListView,
    AdminITPermissionView,
    AdminITUpdateView,
)

urlpatterns = [
    path("", AdminITListView.as_view(), name="admin-it-list"),
    path("create/", AdminITCreateView.as_view(), name="admin-it-create"),
    path("<uuid:staff_id>/", AdminITDetailView.as_view(), name="admin-it-detail"),
    path("<uuid:staff_id>/update/", AdminITUpdateView.as_view(), name="admin-it-update"),
    path("<uuid:staff_id>/delete/", AdminITDeleteView.as_view(), name="admin-it-delete"),
    path("<uuid:staff_id>/activate/", AdminITActivateView.as_view(), name="admin-it-activate"),
    path("<uuid:staff_id>/deactivate/", AdminITDeactivateView.as_view(), name="admin-it-deactivate"),
    path("<uuid:staff_id>/change-status/", AdminITChangeStatusView.as_view(), name="admin-it-change-status"),
    path("<uuid:staff_id>/permissions/", AdminITPermissionView.as_view(), name="admin-it-permissions"),
]
