from django.core.exceptions import ObjectDoesNotExist, PermissionDenied
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.communications.serializers import ChatMessageSerializer, MessageCreateSerializer
from apps.communications.services import ChatService


class ThreadMessagesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, thread_id):
        try:
            thread = ChatService.get_thread(request.user, thread_id)
            messages = ChatService.list_messages(request.user, thread)
            ChatService.mark_thread_read(request.user, thread)
        except ObjectDoesNotExist:
            return Response({"detail": "Chat thread not found."}, status=status.HTTP_404_NOT_FOUND)
        except PermissionDenied as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        return Response(
            {"messages": ChatMessageSerializer(messages, many=True).data},
            status=status.HTTP_200_OK,
        )

    def post(self, request, thread_id):
        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            thread = ChatService.get_thread(request.user, thread_id)
            message = ChatService.send_message(
                request.user,
                thread,
                body=serializer.validated_data["body"],
            )
        except ObjectDoesNotExist:
            return Response({"detail": "Chat thread not found."}, status=status.HTTP_404_NOT_FOUND)
        except PermissionDenied as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {"message": ChatMessageSerializer(message).data},
            status=status.HTTP_201_CREATED,
        )


class CaseThreadMessagesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, case_id):
        try:
            thread = ChatService.get_or_create_case_thread(user=request.user, case_id=case_id)
            messages = ChatService.list_messages(request.user, thread)
            ChatService.mark_thread_read(request.user, thread)
        except ObjectDoesNotExist:
            return Response({"detail": "Case not found."}, status=status.HTTP_404_NOT_FOUND)
        except PermissionDenied as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        return Response(
            {"messages": ChatMessageSerializer(messages, many=True).data},
            status=status.HTTP_200_OK,
        )

    def post(self, request, case_id):
        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            thread = ChatService.get_or_create_case_thread(user=request.user, case_id=case_id)
            message = ChatService.send_message(
                request.user,
                thread,
                body=serializer.validated_data["body"],
            )
        except ObjectDoesNotExist:
            return Response({"detail": "Case not found."}, status=status.HTTP_404_NOT_FOUND)
        except PermissionDenied as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {"message": ChatMessageSerializer(message).data},
            status=status.HTTP_201_CREATED,
        )