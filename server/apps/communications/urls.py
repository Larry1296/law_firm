from django.urls import path

from apps.communications.views.client_communication_view import ClientCommunicationAmendView, ClientCommunicationListCreateView

from apps.communications.views import (
    AnnouncementInboxView,
    AnnouncementReadView,
    CaseChatThreadView,
    CaseLawyerChatThreadView,
    CaseThreadMessagesView,
    ChatThreadDetailView,
    ChatThreadListView,
    ForwardMessageToClientView,
    ForwardMessageToLawyerView,
    ThreadMessagesView,
)

urlpatterns = [
    path("matters/<uuid:matter_id>/records/", ClientCommunicationListCreateView.as_view(), name="client-communication-records"),
    path("records/<uuid:communication_id>/amend/", ClientCommunicationAmendView.as_view(), name="client-communication-amend"),
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
        "cases/<uuid:case_id>/lawyer-thread/",
        CaseLawyerChatThreadView.as_view(),
        name="communication-case-lawyer-thread",
    ),
    path(
        "cases/<uuid:case_id>/messages/",
        CaseThreadMessagesView.as_view(),
        name="communication-case-messages",
    ),
    path(
        "messages/<uuid:message_id>/forward-to-lawyer/",
        ForwardMessageToLawyerView.as_view(),
        name="communication-message-forward-lawyer",
    ),
    path(
        "messages/<uuid:message_id>/forward-to-client/",
        ForwardMessageToClientView.as_view(),
        name="communication-message-forward-client",
    ),
]
