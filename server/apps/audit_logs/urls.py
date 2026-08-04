from django.urls import path

from apps.audit_logs.views import AuditEventListView

urlpatterns = [path("", AuditEventListView.as_view(), name="audit-event-list")]
