from django.core.exceptions import ObjectDoesNotExist
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.events.serializers import (
    EventAwarenessUpdateSerializer,
    EventCreateSerializer,
    EventSerializer,
    EventUpdateSerializer,
    EventClientAwarenessSerializer,
    VirtualCourtroomLinkUpdateSerializer,
)
from apps.events.services import EventService
from apps.cases.services.virtual_courtroom_service import VirtualCourtroomService


class EventListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        events = EventService.list_events(
            request.user,
            scope=request.query_params.get("scope", ""),
            case_id=request.query_params.get("case_id"),
        )
        return Response({"events": EventSerializer(events, many=True).data})

    def post(self, request):
        serializer = EventCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            event = EventService.create_event(
                user=request.user,
                validated_data=serializer.validated_data,
            )
        except ObjectDoesNotExist:
            return Response({"detail": "Case not found."}, status=status.HTTP_404_NOT_FOUND)
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        return Response({"event": EventSerializer(event).data}, status=status.HTTP_201_CREATED)


class CaseEventListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, case_id):
        events = EventService.list_events(request.user, case_id=case_id)
        return Response({"events": EventSerializer(events, many=True).data}, status=status.HTTP_200_OK)

    def post(self, request, case_id):
        payload = {**request.data, "case_id": str(case_id)}
        serializer = EventCreateSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        try:
            event = EventService.create_event(
                user=request.user,
                validated_data=serializer.validated_data,
            )
            if event.is_virtual_courtroom_enabled and event.virtual_courtroom_url:
                VirtualCourtroomService.notify_link_available(event, actor=request.user)
        except ObjectDoesNotExist:
            return Response({"detail": "Case not found."}, status=status.HTTP_404_NOT_FOUND)
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        return Response({"event": EventSerializer(event).data}, status=status.HTTP_201_CREATED)


class VirtualCourtroomTodayView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        events = EventService.list_events(request.user, scope="today").filter(
            event_type__in=EventService.COURT_EVENT_TYPES,
        )
        return Response({"events": EventSerializer(events, many=True).data}, status=status.HTTP_200_OK)


class VirtualCourtroomLinkUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, event_id):
        try:
            event = EventService.scoped_events(request.user).get(id=event_id)
        except ObjectDoesNotExist:
            return Response({"detail": "Event not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = VirtualCourtroomLinkUpdateSerializer(
            data=request.data,
            context={"event": event},
        )
        serializer.is_valid(raise_exception=True)

        try:
            event = VirtualCourtroomService.update_link(
                user=request.user,
                event_id=event_id,
                validated_data=serializer.validated_data,
            )
        except ObjectDoesNotExist:
            return Response({"detail": "Event not found."}, status=status.HTTP_404_NOT_FOUND)
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        return Response({"event": EventSerializer(event).data}, status=status.HTTP_200_OK)


class EventDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, event_id):
        serializer = EventUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            event = EventService.update_event(
                user=request.user,
                event_id=event_id,
                validated_data=serializer.validated_data,
            )
        except ObjectDoesNotExist:
            return Response({"detail": "Event not found."}, status=status.HTTP_404_NOT_FOUND)
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        return Response({"event": EventSerializer(event).data})


class EventAwarenessView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, event_id):
        serializer = EventAwarenessUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            awareness = EventService.update_awareness(
                user=request.user,
                event_id=event_id,
                validated_data=serializer.validated_data,
            )
        except ObjectDoesNotExist:
            return Response({"detail": "Event not found."}, status=status.HTTP_404_NOT_FOUND)
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        return Response({"client_awareness": EventClientAwarenessSerializer(awareness).data})
