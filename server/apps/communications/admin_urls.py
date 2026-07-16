from django.urls import path

from apps.communications.views import (
    AdminAnnouncementDetailView,
    AdminAnnouncementListCreateView,
    ChatThreadDetailView,
    ChatThreadListView,
    DirectStaffThreadListCreateView,
    DirectStaffBulkMessageView,
    StaffContactListView,
    ThreadMessagesView,
)

urlpatterns = [
    path("announcements/", AdminAnnouncementListCreateView.as_view(), name="admin-announcement-list"),
    path(
        "announcements/<uuid:announcement_id>/",
        AdminAnnouncementDetailView.as_view(),
        name="admin-announcement-detail",
    ),
    path("staff-threads/", DirectStaffThreadListCreateView.as_view(), name="admin-staff-thread-list"),
    path("staff-threads/bulk/", DirectStaffBulkMessageView.as_view(), name="admin-staff-thread-bulk"),
    path("staff-contacts/", StaffContactListView.as_view(), name="admin-staff-contact-list"),
    path("threads/", ChatThreadListView.as_view(), name="admin-communication-thread-list"),
    path(
        "threads/<uuid:thread_id>/",
        ChatThreadDetailView.as_view(),
        name="admin-communication-thread-detail",
    ),
    path(
        "threads/<uuid:thread_id>/messages/",
        ThreadMessagesView.as_view(),
        name="admin-communication-thread-messages",
    ),
]
