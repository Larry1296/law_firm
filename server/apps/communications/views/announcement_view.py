from django.core.exceptions import ObjectDoesNotExist, PermissionDenied
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.communications.serializers import (
    AnnouncementCreateSerializer,
    AnnouncementInboxSerializer,
    AnnouncementSerializer,
)
from apps.communications.services import AnnouncementService


class AdminAnnouncementListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            announcements = AnnouncementService.list_admin_announcements(request.user)
        except PermissionDenied as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        return Response(
            {"announcements": AnnouncementSerializer(announcements, many=True).data},
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = AnnouncementCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            announcement = AnnouncementService.create_announcement(
                user=request.user,
                validated_data=serializer.validated_data,
            )
        except PermissionDenied as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {"announcement": AnnouncementSerializer(announcement).data},
            status=status.HTTP_201_CREATED,
        )


class AdminAnnouncementDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, announcement_id):
        try:
            announcement = AnnouncementService.get_admin_announcement(
                request.user,
                announcement_id,
            )
        except PermissionDenied as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ObjectDoesNotExist:
            return Response({"detail": "Announcement not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            {"announcement": AnnouncementSerializer(announcement).data},
            status=status.HTTP_200_OK,
        )


class AnnouncementInboxView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        announcements = AnnouncementService.list_user_announcements(request.user)
        return Response(
            {"announcements": AnnouncementInboxSerializer(announcements, many=True).data},
            status=status.HTTP_200_OK,
        )


class AnnouncementReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, announcement_id):
        try:
            recipient = AnnouncementService.mark_read(request.user, announcement_id)
        except ObjectDoesNotExist:
            return Response({"detail": "Announcement not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            {"announcement": AnnouncementInboxSerializer(recipient).data},
            status=status.HTTP_200_OK,
        )