from django.urls import path
from .views import KnowledgeBaseAskView

urlpatterns = [
    path("ask/", KnowledgeBaseAskView.as_view(), name="knowledge-base-ask"),
]
