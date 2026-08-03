from django.urls import include, path
from apps.ai.views import AdminMatterAssessmentCreateView, AdminMatterIntelligenceDetailView, AdminMatterIntelligenceListView, AdminPublicKnowledgeActionView, AdminPublicKnowledgeDetailView, AdminPublicKnowledgeListView

urlpatterns = [
    path("public-knowledge/", AdminPublicKnowledgeListView.as_view(), name="admin-public-knowledge"),
    path("public-knowledge/<uuid:item_id>/", AdminPublicKnowledgeDetailView.as_view(), name="admin-public-knowledge-detail"),
    path("public-knowledge/<uuid:item_id>/<str:action>/", AdminPublicKnowledgeActionView.as_view(), name="admin-public-knowledge-action"),
    path("ai/matters/", AdminMatterIntelligenceListView.as_view(), name="admin-ai-matters"),
    path("ai/matters/<uuid:matter_id>/", AdminMatterIntelligenceDetailView.as_view(), name="admin-ai-matter-detail"),
    path("ai/matters/<uuid:matter_id>/assessments/", AdminMatterAssessmentCreateView.as_view(), name="admin-ai-matter-assessment-create"),
    path("firm/", include("apps.firm.admin_urls")),
    path("staff/", include("apps.staff.admin_urls")),
    path("clients/", include("apps.clients.admin_urls")),
    path("communications/", include("apps.communications.admin_urls")),
]
