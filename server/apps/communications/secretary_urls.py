from django.urls import path

from apps.communications.views import SecretaryCaseThreadListView

urlpatterns = [
    path("case-threads/", SecretaryCaseThreadListView.as_view(), name="secretary-case-thread-list"),
]