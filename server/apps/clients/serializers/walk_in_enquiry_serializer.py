from rest_framework import serializers

from apps.clients.models import WalkInEnquiry


class WalkInEnquirySerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    urgency_label = serializers.CharField(source="get_urgency_type_display", read_only=True)
    received_by_name = serializers.CharField(source="received_by.full_name", read_only=True)
    related_party_names = serializers.ListField(
        child=serializers.CharField(max_length=255, allow_blank=True), required=False, default=list,
    )

    class Meta:
        model = WalkInEnquiry
        fields = [
            "id", "reference", "received_at", "visitor_name", "safe_contact", "visitor_type",
            "organisation_name", "service_category", "related_party_names", "urgency_type",
            "urgency_label", "urgency_note", "critical_date", "referral_source", "description",
            "privacy_acknowledged", "received_by", "received_by_name", "status", "status_label",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "reference", "received_by", "status", "created_at", "updated_at"]
        extra_kwargs = {"privacy_acknowledged": {"required": True}}

    def validate_privacy_acknowledged(self, value):
        if not value:
            raise serializers.ValidationError("The visitor must acknowledge the privacy notice.")
        return value

    def validate_related_party_names(self, value):
        return [name.strip() for name in value if name.strip()]

    def validate(self, attrs):
        errors = {}
        if attrs.get("visitor_type") == WalkInEnquiry.VisitorType.ORGANISATION_REPRESENTATIVE:
            if not attrs.get("organisation_name"):
                errors["organisation_name"] = "Organisation name is required for an organisation representative."
        else:
            attrs["organisation_name"] = ""
        if attrs.get("urgency_type", WalkInEnquiry.UrgencyType.NONE) != WalkInEnquiry.UrgencyType.NONE:
            if not attrs.get("urgency_note"):
                errors["urgency_note"] = "A brief urgency note is required when urgency is selected."
        else:
            attrs["urgency_note"] = ""
        if errors:
            raise serializers.ValidationError(errors)
        return attrs
