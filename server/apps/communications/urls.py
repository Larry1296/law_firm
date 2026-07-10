from django.urls import path

from apps.communications.views import (
    AnnouncementInboxView,
    AnnouncementReadView,
    CaseChatThreadView,
    CaseThreadMessagesView,
    ChatThreadDetailView,
    ChatThreadListView,
    ThreadMessagesView,
)

urlpatterns = [
    path("announcements/", AnnouncementInboxView.as_view(), name="communication-announcements"),
    path(
        "announcements/<uuid:announcement_id>/read/",
        AnnouncementReadView.as_view(),
        name="communication-announcement-read",
    ),
    path("threads/", ChatThreadListView.as_view(), name="communication-thread-list"),
    path("threads/<uuid:thread_id>/", ChatThreadDetailView.as_view(), name="communication-thread-detail"),
    path(
        "threads/<uuid:thread_id>/messages/",
        ThreadMessagesView.as_view(),
        name="communication-thread-messages",
    ),
    path(
        "cases/<uuid:case_id>/thread/",
        CaseChatThreadView.as_view(),
        name="communication-case-thread",
    ),
    path(
        "cases/<uuid:case_id>/messages/",
        CaseThreadMessagesView.as_view(),
        name="communication-case-messages",
    ),
]