"""API views for KYC folder management."""

from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clients.models import Client, ClientKycFolder
from apps.documents.serializers.kyc_folder_serializer import (
    KycFolderCloseSerializer,
    KycFolderCreateSerializer,
    KycFolderDetailSerializer,
)
from apps.documents.services.workflow_service import DocumentWorkflowService


class KycFolderListCreateView(APIView):
    """List KYC folders for a client, or open a new one."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        client_id = request.query_params.get("client_id")
        if not client_id:
            return Response(
                {"detail": "client_id query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            user_firm = DocumentWorkflowService._firm_for_user(request.user)
        except (PermissionError, AttributeError):
            user_firm = getattr(getattr(request.user, "owned_firm", None), "id", None)
            if not user_firm:
                return Response({"detail": "Not attached to a firm."}, status=status.HTTP_403_FORBIDDEN)

        try:
            client = Client.objects.get(id=client_id, firm_id=user_firm)
        except (Client.DoesNotExist, TypeError):
            return Response({"detail": "Client not found."}, status=status.HTTP_404_NOT_FOUND)

        folders = DocumentWorkflowService.kyc_folders_for_client(client)
        serializer = KycFolderDetailSerializer(folders, many=True)
        return Response({"data": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = KycFolderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        client_id = serializer.validated_data.get("client_id")
        if not client_id:
            return Response(
                {"detail": "client_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            firm = DocumentWorkflowService._firm_for_user(request.user)
        except (PermissionError, AttributeError):
            return Response({"detail": "Not attached to a firm."}, status=status.HTTP_403_FORBIDDEN)

        try:
            client = Client.objects.get(id=client_id, firm=firm)
        except Client.DoesNotExist:
            return Response({"detail": "Client not found."}, status=status.HTTP_404_NOT_FOUND)

        # Create a new KYC folder with the next sequential reference.
        year = timezone.now().year
        prefix = f"KYC-{year}-"
        latest = (
            ClientKycFolder.objects.filter(firm=firm, reference__startswith=prefix)
            .order_by("-reference")
            .first()
        )
        next_number = 1
        if latest:
            try:
                next_number = int(latest.reference.rsplit("-", 1)[1]) + 1
            except (IndexError, ValueError):
                next_number = (
                    ClientKycFolder.objects.filter(firm=firm, reference__startswith=prefix).count() + 1
                )
        reference = f"{prefix}{next_number:03d}"

        folder = ClientKycFolder.objects.create(
            firm=firm,
            client=client,
            reference=reference,
            opened_by=request.user,
            notes=serializer.validated_data.get("notes", ""),
        )

        return Response(
            {"data": KycFolderDetailSerializer(folder).data},
            status=status.HTTP_201_CREATED,
        )


class KycFolderDetailView(APIView):
    """Retrieve a KYC folder or close it."""

    permission_classes = [IsAuthenticated]

    def get(self, request, kyc_folder_id):
        try:
            folder = (
                ClientKycFolder.objects.select_related("client", "opened_by")
                .prefetch_related("documents")
                .get(id=kyc_folder_id)
            )
        except ClientKycFolder.DoesNotExist:
            return Response({"detail": "KYC folder not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            {"data": KycFolderDetailSerializer(folder).data},
            status=status.HTTP_200_OK,
        )

    def post(self, request, kyc_folder_id):
        """Close a KYC folder."""
        try:
            folder = ClientKycFolder.objects.get(id=kyc_folder_id)
        except ClientKycFolder.DoesNotExist:
            return Response({"detail": "KYC folder not found."}, status=status.HTTP_404_NOT_FOUND)

        if folder.status == ClientKycFolder.Status.CLOSED:
            return Response(
                {"detail": "This KYC folder is already closed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = KycFolderCloseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        folder.status = ClientKycFolder.Status.CLOSED
        folder.closed_at = timezone.now()
        if serializer.validated_data.get("notes"):
            folder.notes = (folder.notes + "\n" + serializer.validated_data["notes"]).strip()
        folder.save(update_fields=["status", "closed_at", "notes", "updated_at"])

        return Response(
            {"data": KycFolderDetailSerializer(folder).data},
            status=status.HTTP_200_OK,
        )
