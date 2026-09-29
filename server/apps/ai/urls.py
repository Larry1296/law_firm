from django.urls import path

from apps.ai.views import KnowledgeBaseAskView, KnowledgeBaseCategoryListView, PlatformLegalAssistantView
from apps.ai.views.dashboard_assistant_view import DashboardAssistantView

urlpatterns = [
    path("knowledge-base/", KnowledgeBaseCategoryListView.as_view(), name="knowledge-base-list"),
    path("knowledge-base/ask/", KnowledgeBaseAskView.as_view(), name="knowledge-base-ask"),
    path("legal-assistant/", PlatformLegalAssistantView.as_view(), name="platform-legal-assistant"),
    path("assistant/<slug:kind>/", DashboardAssistantView.as_view(), name="dashboard-assistant"),
]
