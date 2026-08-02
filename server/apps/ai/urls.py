from django.urls import path

from apps.ai.views import KnowledgeBaseAskView, KnowledgeBaseCategoryListView

urlpatterns = [
    path("knowledge-base/", KnowledgeBaseCategoryListView.as_view(), name="knowledge-base-list"),
    path("knowledge-base/ask/", KnowledgeBaseAskView.as_view(), name="knowledge-base-ask"),
]
