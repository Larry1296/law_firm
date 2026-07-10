from django.urls import path

from apps.staff.views.admin.secretaries import (
    AdminSecretaryActivateView,
    AdminSecretaryChangeStatusView,
    AdminSecretaryCreateView,
    AdminSecretaryDeactivateView,
    AdminSecretaryDeleteView,
    AdminSecretaryDetailView,
    AdminSecretaryListView,
    AdminSecretaryPermissionView,
    AdminSecretaryUpdateView,
)

urlpatterns = [
    path("", AdminSecretaryListView.as_view(), name="admin-secretary-list"),
    path("create/", AdminSecretaryCreateView.as_view(), name="admin-secretary-create"),
    path("<uuid:secretary_id>/", AdminSecretaryDetailView.as_view(), name="admin-secretary-detail"),
    path("<uuid:secretary_id>/update/", AdminSecretaryUpdateView.as_view(), name="admin-secretary-update"),
    path("<uuid:secretary_id>/delete/", AdminSecretaryDeleteView.as_view(), name="admin-secretary-delete"),
    path("<uuid:secretary_id>/activate/", AdminSecretaryActivateView.as_view(), name="admin-secretary-activate"),
    path("<uuid:secretary_id>/deactivate/", AdminSecretaryDeactivateView.as_view(), name="admin-secretary-deactivate"),
    path("<uuid:secretary_id>/change-status/", AdminSecretaryChangeStatusView.as_view(), name="admin-secretary-change-status"),
    path("<uuid:secretary_id>/permissions/", AdminSecretaryPermissionView.as_view(), name="admin-secretary-permissions"),
]
