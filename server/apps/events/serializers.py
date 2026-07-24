from rest_framework import serializers

from apps.cases.models import CaseEvent
from apps.events.models import EventClientAwareness


class EventClientAwarenessSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    updated_by_name = serializers.CharField(source="updated_by.full_name", read_only=True)

    class Meta:
        model = EventClientAwareness
        fields = [
            "id",
            "status",
            "status_label",
            "notified_at",
            "confirmed_at",
            "confirmation_channel",
            "notes",
            "updated_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "status_label", "updated_by_name", "created_at", "updated_at"]


class EventSerializer(serializers.ModelSerializer):
    event_type_label = serializers.CharField(source="get_event_type_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    case = serializers.SerializerMethodField()
    virtual_courtroom_is_available = serializers.SerializerMethodField()
    client_awareness = serializers.SerializerMethodField()

    def get_case(self, obj):
        case = obj.case
        return {
            "id": str(case.id),
            "case_number": case.case_number,
            "official_court_case_number": getattr(case, "official_court_case_number", "") or "",
            "title": case.title,
            "client": {
                "id": str(case.client_id),
                "full_name": case.client.full_name,
            },
            "assigned_lawyer": (
                {
                    "id": str(case.assigned_lawyer_id),
                    "full_name": case.assigned_lawyer.user.full_name,
                    "email": case.assigned_lawyer.user.email,
                }
                if case.assigned_lawyer_id
                else None
            ),
            "assigned_secretary": (
                {
                    "id": str(case.assigned_secretary_id),
                    "full_name": case.assigned_secretary.user.full_name,
                    "email": case.assigned_secretary.user.email,
                }
                if case.assigned_secretary_id
                else None
            ),
        }

    def get_virtual_courtroom_is_available(self, obj):
        from apps.cases.services.virtual_courtroom_service import VirtualCourtroomService

        return VirtualCourtroomService.is_link_available(obj)

    def get_client_awareness(self, obj):
        awareness = getattr(obj, "client_awareness", None)
        if not awareness:
            return None
        return EventClientAwarenessSerializer(awareness).data

    class Meta:
        model = CaseEvent
        fields = [
            "id",
            "case",
            "event_type",
            "event_subtype",
            "event_type_label",
            "status",
            "status_label",
            "title",
            "description",
            "starts_at",
            "ends_at",
            "actual_start",
            "actual_end",
            "court_stage_before",
            "court_stage_after",
            "matter_status_before",
            "matter_status_after",
            "court",
            "court_station",
            "courtroom",
            "hearing_mode",
            "virtual_meeting_url",
            "virtual_access_instructions",
            "physical_venue",
            "judicial_officer",
            "virtual_courtroom_url",
            "virtual_courtroom_label",
            "virtual_courtroom_available_from",
            "virtual_courtroom_available_until",
            "is_virtual_courtroom_enabled",
            "virtual_courtroom_is_available",
            "cause_list_position",
            "adjournment_reason",
            "outcome",
            "orders_directions",
            "next_action",
            "next_date",
            "cancelled_by",
            "cancellation_reason",
            "is_client_visible",
            "client_awareness",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class EventCreateSerializer(serializers.Serializer):
    case_id = serializers.UUIDField()
    event_type = serializers.ChoiceField(choices=CaseEvent.EventType.choices)
    event_subtype = serializers.CharField(max_length=80, required=False, allow_blank=True)
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    starts_at = serializers.DateTimeField()
    ends_at = serializers.DateTimeField(required=False, allow_null=True)
    actual_start = serializers.DateTimeField(required=False, allow_null=True)
    actual_end = serializers.DateTimeField(required=False, allow_null=True)
    court_stage_before = serializers.CharField(max_length=50, required=False, allow_blank=True)
    court_stage_after = serializers.CharField(max_length=50, required=False, allow_blank=True)
    matter_status_before = serializers.CharField(max_length=50, required=False, allow_blank=True)
    matter_status_after = serializers.CharField(max_length=50, required=False, allow_blank=True)
    court = serializers.CharField(max_length=255, required=False, allow_blank=True)
    court_station = serializers.CharField(max_length=255, required=False, allow_blank=True)
    courtroom = serializers.CharField(max_length=100, required=False, allow_blank=True)
    hearing_mode = serializers.ChoiceField(choices=CaseEvent.HearingMode.choices, required=False)
    virtual_meeting_url = serializers.URLField(max_length=1000, required=False, allow_blank=True)
    virtual_access_instructions = serializers.CharField(required=False, allow_blank=True)
    physical_venue = serializers.CharField(max_length=255, required=False, allow_blank=True)
    judicial_officer = serializers.CharField(max_length=255, required=False, allow_blank=True)
    cause_list_position = serializers.CharField(max_length=50, required=False, allow_blank=True)
    is_client_visible = serializers.BooleanField(required=False, default=True)
    virtual_courtroom_url = serializers.URLField(max_length=1000, required=False, allow_blank=True)
    virtual_courtroom_label = serializers.CharField(max_length=120, required=False, allow_blank=True)
    virtual_courtroom_available_from = serializers.DateTimeField(required=False, allow_null=True)
    virtual_courtroom_available_until = serializers.DateTimeField(required=False, allow_null=True)
    is_virtual_courtroom_enabled = serializers.BooleanField(required=False, default=False)
    next_action = serializers.CharField(max_length=255, required=False, allow_blank=True)
    next_date = serializers.DateTimeField(required=False, allow_null=True)
    notify_participants = serializers.BooleanField(required=False, default=True)


    def validate(self, attrs):
        starts_at = attrs.get("starts_at")
        ends_at = attrs.get("ends_at")
        available_from = attrs.get("virtual_courtroom_available_from")
        available_until = attrs.get("virtual_courtroom_available_until")

        if ends_at and starts_at and ends_at <= starts_at:
            raise serializers.ValidationError("End time must be after start time.")
        if available_from and available_until and available_until <= available_from:
            raise serializers.ValidationError("Courtroom link expiry must be after availability start.")
        if attrs.get("is_virtual_courtroom_enabled") and not attrs.get("virtual_courtroom_url"):
            raise serializers.ValidationError("A courtroom link is required when virtual courtroom access is enabled.")
        return attrs


class EventUpdateSerializer(serializers.Serializer):
    event_type = serializers.ChoiceField(choices=CaseEvent.EventType.choices, required=False)
    status = serializers.ChoiceField(choices=CaseEvent.EventStatus.choices, required=False)
    event_subtype = serializers.CharField(max_length=80, required=False, allow_blank=True)
    title = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    starts_at = serializers.DateTimeField(required=False)
    ends_at = serializers.DateTimeField(required=False, allow_null=True)
    actual_start = serializers.DateTimeField(required=False, allow_null=True)
    actual_end = serializers.DateTimeField(required=False, allow_null=True)
    court_stage_before = serializers.CharField(max_length=50, required=False, allow_blank=True)
    court_stage_after = serializers.CharField(max_length=50, required=False, allow_blank=True)
    matter_status_before = serializers.CharField(max_length=50, required=False, allow_blank=True)
    matter_status_after = serializers.CharField(max_length=50, required=False, allow_blank=True)
    court = serializers.CharField(max_length=255, required=False, allow_blank=True)
    court_station = serializers.CharField(max_length=255, required=False, allow_blank=True)
    courtroom = serializers.CharField(max_length=100, required=False, allow_blank=True)
    hearing_mode = serializers.ChoiceField(choices=CaseEvent.HearingMode.choices, required=False)
    virtual_meeting_url = serializers.URLField(max_length=1000, required=False, allow_blank=True)
    virtual_access_instructions = serializers.CharField(required=False, allow_blank=True)
    physical_venue = serializers.CharField(max_length=255, required=False, allow_blank=True)
    judicial_officer = serializers.CharField(max_length=255, required=False, allow_blank=True)
    cause_list_position = serializers.CharField(max_length=50, required=False, allow_blank=True)
    virtual_courtroom_url = serializers.URLField(max_length=1000, required=False, allow_blank=True)
    virtual_courtroom_label = serializers.CharField(max_length=120, required=False, allow_blank=True)
    virtual_courtroom_available_from = serializers.DateTimeField(required=False, allow_null=True)
    virtual_courtroom_available_until = serializers.DateTimeField(required=False, allow_null=True)
    is_virtual_courtroom_enabled = serializers.BooleanField(required=False)
    is_client_visible = serializers.BooleanField(required=False)
    adjournment_reason = serializers.CharField(required=False, allow_blank=True)
    outcome = serializers.CharField(required=False, allow_blank=True)
    orders_directions = serializers.CharField(required=False, allow_blank=True)
    next_action = serializers.CharField(max_length=255, required=False, allow_blank=True)
    next_date = serializers.DateTimeField(required=False, allow_null=True)
    cancellation_reason = serializers.CharField(required=False, allow_blank=True)
    notify_participants = serializers.BooleanField(required=False, default=True)

    def validate(self, attrs):
        starts_at = attrs.get("starts_at")
        ends_at = attrs.get("ends_at")
        available_from = attrs.get("virtual_courtroom_available_from")
        available_until = attrs.get("virtual_courtroom_available_until")
        if starts_at and ends_at and ends_at <= starts_at:
            raise serializers.ValidationError("End time must be after start time.")
        if available_from and available_until and available_until <= available_from:
            raise serializers.ValidationError("Courtroom link expiry must be after availability start.")
        return attrs


class VirtualCourtroomLinkUpdateSerializer(serializers.Serializer):
    virtual_courtroom_url = serializers.URLField(max_length=1000, required=False, allow_blank=True)
    virtual_courtroom_label = serializers.CharField(max_length=120, required=False, allow_blank=True)
    virtual_courtroom_available_from = serializers.DateTimeField(required=False, allow_null=True)
    virtual_courtroom_available_until = serializers.DateTimeField(required=False, allow_null=True)
    is_virtual_courtroom_enabled = serializers.BooleanField(required=False)
    notify_participants = serializers.BooleanField(required=False, default=True)

    def validate(self, attrs):
        available_from = attrs.get("virtual_courtroom_available_from")
        available_until = attrs.get("virtual_courtroom_available_until")
        if available_from and available_until and available_until <= available_from:
            raise serializers.ValidationError("Courtroom link expiry must be after availability start.")
        if attrs.get("is_virtual_courtroom_enabled") is True and not attrs.get("virtual_courtroom_url"):
            event = self.context.get("event")
            existing_url = getattr(event, "virtual_courtroom_url", "")
            if not existing_url:
                raise serializers.ValidationError("A courtroom link is required when virtual courtroom access is enabled.")
        return attrs


class EventAwarenessUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=EventClientAwareness.AwarenessStatus.choices)
    confirmation_channel = serializers.CharField(max_length=50, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
