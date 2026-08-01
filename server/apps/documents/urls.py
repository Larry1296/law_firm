from django.urls import path

from apps.documents.views.document_download_view import DocumentDownloadView
from apps.documents.views.kyc_folder_view import KycFolderDetailView, KycFolderListCreateView
from apps.documents.views.kyc_upload_view import KycDocumentUploadView

urlpatterns = [
    path("<int:document_id>/download/", DocumentDownloadView.as_view(), name="document-download"),
    path("clients/<uuid:client_id>/kyc/", KycDocumentUploadView.as_view(), name="client-kyc-document-upload"),

    # ── KYC folder management ─────────────────────────────────────────
    path("kyc-folders/", KycFolderListCreateView.as_view(), name="kyc-folder-list-create"),
    path("kyc-folders/<uuid:kyc_folder_id>/", KycFolderDetailView.as_view(), name="kyc-folder-detail"),
]
