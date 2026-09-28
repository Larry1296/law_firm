from django.urls import include, path

from apps.ai.views.court_preparation_view import ClientCourtPreparationView

urlpatterns = [
    path("court-preparation/", ClientCourtPreparationView.as_view(), name="client-court-preparation"),
    path("", include("apps.clients.urls")),
]
