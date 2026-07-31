from django.urls import path

from apps.documents.views.document_download_view import DocumentDownloadView
from apps.documents.views.kyc_upload_view import KycDocumentUploadView

urlpatterns = [
    path("<int:document_id>/download/", DocumentDownloadView.as_view(), name="document-download"),
    path("clients/<uuid:client_id>/kyc/", KycDocumentUploadView.as_view(), name="client-kyc-document-upload"),
]
