from django.urls import path

from apps.staff.views.admin.accountants import (
    AdminAccountantActivateView,
    AdminAccountantChangeStatusView,
    AdminAccountantCreateView,
    AdminAccountantDeactivateView,
    AdminAccountantDeleteView,
    AdminAccountantDetailView,
    AdminAccountantListView,
    AdminAccountantPermissionView,
    AdminAccountantUpdateView,
)

urlpatterns = [
    path("", AdminAccountantListView.as_view(), name="admin-accountant-list"),
    path("create/", AdminAccountantCreateView.as_view(), name="admin-accountant-create"),
    path("<uuid:staff_id>/", AdminAccountantDetailView.as_view(), name="admin-accountant-detail"),
    path("<uuid:staff_id>/update/", AdminAccountantUpdateView.as_view(), name="admin-accountant-update"),
    path("<uuid:staff_id>/delete/", AdminAccountantDeleteView.as_view(), name="admin-accountant-delete"),
    path("<uuid:staff_id>/activate/", AdminAccountantActivateView.as_view(), name="admin-accountant-activate"),
    path("<uuid:staff_id>/deactivate/", AdminAccountantDeactivateView.as_view(), name="admin-accountant-deactivate"),
    path("<uuid:staff_id>/change-status/", AdminAccountantChangeStatusView.as_view(), name="admin-accountant-change-status"),
    path("<uuid:staff_id>/permissions/", AdminAccountantPermissionView.as_view(), name="admin-accountant-permissions"),
]
