from django.core.exceptions import ObjectDoesNotExist, PermissionDenied
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.choices import FirmRole
from apps.communications.choices import ChatThreadType
from apps.communications.serializers import (
    ChatThreadSerializer,
    DirectStaffThreadCreateSerializer,
)
from apps.communications.services import ChatService, CommunicationAccessService


class ChatThreadListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        thread_type = request.query_params.get("thread_type")
        threads = ChatService.list_threads(request.user, thread_type=thread_type)
        serializer = ChatThreadSerializer(
            threads,
            many=True,
            context={"request": request},
        )
        return Response({"threads": serializer.data}, status=status.HTTP_200_OK)


class ChatThreadDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, thread_id):
        try:
            thread = ChatService.get_thread(request.user, thread_id)
        except ObjectDoesNotExist:
            return Response({"detail": "Chat thread not found."}, status=status.HTTP_404_NOT_FOUND)
        except PermissionDenied as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        return Response(
            {"thread": ChatThreadSerializer(thread, context={"request": request}).data},
            status=status.HTTP_200_OK,
        )


class DirectStaffThreadListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        threads = ChatService.list_threads(
            request.user,
            thread_type=ChatThreadType.DIRECT_STAFF,
        )
        serializer = ChatThreadSerializer(
            threads,
            many=True,
            context={"request": request},
        )
        return Response({"threads": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = DirectStaffThreadCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            thread, _ = ChatService.start_direct_staff_thread(
                admin_user=request.user,
                staff_user_id=serializer.validated_data["staff_user_id"],
                subject=serializer.validated_data.get("subject", ""),
                message=serializer.validated_data.get("message", ""),
            )
        except ObjectDoesNotExist:
            return Response(
                {"detail": "Selected staff member was not found in this firm."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except PermissionDenied as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        return Response(
            {"thread": ChatThreadSerializer(thread, context={"request": request}).data},
            status=status.HTTP_201_CREATED,
        )


class StaffContactListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not CommunicationAccessService.is_admin(request.user):
            return Response(
                {"detail": "Only admins can view staff contacts."},
                status=status.HTTP_403_FORBIDDEN,
            )

        firm = CommunicationAccessService.get_user_firm(request.user)
        staff_members = (
            firm.members.select_related("user")
            .filter(
                role__in=FirmRole.staff_roles(),
                is_active=True,
                user__is_active=True,
            )
            .order_by("role", "user__first_name", "user__last_name")
        )

        contacts = [
            {
                "id": str(member.user.id),
                "full_name": member.user.full_name,
                "email": member.user.email,
                "phone_number": member.user.phone_number,
                "firm_role": member.role,
                "department": member.role,
            }
            for member in staff_members
        ]

        return Response({"staff": contacts}, status=status.HTTP_200_OK)


class CaseChatThreadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, case_id):
        try:
            thread = ChatService.get_or_create_case_thread(user=request.user, case_id=case_id)
        except ObjectDoesNotExist:
            return Response({"detail": "Case not found."}, status=status.HTTP_404_NOT_FOUND)
        except PermissionDenied as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        return Response(
            {"thread": ChatThreadSerializer(thread, context={"request": request}).data},
            status=status.HTTP_200_OK,
        )


class CaseLawyerChatThreadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, case_id):
        try:
            thread = ChatService.get_or_create_case_lawyer_thread(
                user=request.user,
                case_id=case_id,
            )
        except ObjectDoesNotExist:
            return Response({"detail": "Case not found."}, status=status.HTTP_404_NOT_FOUND)
        except PermissionDenied as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        return Response(
            {"thread": ChatThreadSerializer(thread, context={"request": request}).data},
            status=status.HTTP_200_OK,
        )


class SecretaryCaseThreadListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not CommunicationAccessService.is_secretary(request.user):
            return Response(
                {"detail": "Only secretaries can access the secretary communication inbox."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            threads = ChatService.list_threads(
                request.user,
                thread_type=ChatThreadType.CASE_CLIENT,
            )
        except PermissionDenied as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        serializer = ChatThreadSerializer(
            threads,
            many=True,
            context={"request": request},
        )
        return Response({"threads": serializer.data}, status=status.HTTP_200_OK)
