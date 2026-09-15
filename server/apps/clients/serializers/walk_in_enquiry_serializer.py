from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from apps.clients.models import WalkInEnquiry, WalkInEnquiryCorrection


EDITABLE_FIELDS = [
    'received_at', 'received_at_reason', 'visitor_name', 'safe_contact', 'enquiry_for',
    'prospective_person_name', 'organisation_name', 'visitor_capacity', 'authority_status',
    'service_category', 'related_party_names', 'urgency_type', 'urgency_note',
    'critical_date', 'referral_source', 'description',
]


class WalkInEnquirySerializer(serializers.ModelSerializer):
    status_label = serializers.SerializerMethodField()

    def get_status_label(self, obj):
        review = getattr(obj, 'preliminary_review', None)
        return review.get_state_display() if review else obj.get_status_display()
    urgency_label = serializers.CharField(source='get_urgency_type_display', read_only=True)
    received_by_name = serializers.CharField(source='received_by.full_name', read_only=True)
    related_party_names = serializers.ListField(
        child=serializers.CharField(max_length=255, allow_blank=True), required=False, default=list,
        max_length=50,
    )
    notice_receipt = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = WalkInEnquiry
        fields = EDITABLE_FIELDS + [
            'id', 'reference', 'visitor_type', 'urgency_label', 'privacy_acknowledged',
            'received_by', 'received_by_name', 'status', 'status_label', 'created_at', 'updated_at',
            'notice_receipt', 'notice_version', 'notice_delivery_method', 'notice_delivered_at',
            'notice_snapshot', 'revision',
        ]
        read_only_fields = ['id', 'reference', 'visitor_type', 'received_by', 'status', 'created_at',
                            'updated_at', 'notice_version', 'notice_delivery_method',
                            'notice_delivered_at', 'notice_snapshot', 'revision']
        extra_kwargs = {
            'privacy_acknowledged': {'required': True},
            'enquiry_for': {'required': True, 'allow_blank': False},
            'authority_status': {'required': True, 'allow_blank': False},
        }

    def validate_privacy_acknowledged(self, value):
        if not value:
            raise serializers.ValidationError('The visitor must acknowledge the privacy notice.')
        return value

    def validate_related_party_names(self, value):
        return [name.strip() for name in value if name.strip()]

    def validate(self, attrs):
        errors = {}
        for key in ('consent', 'consent_given', 'lawful_basis'):
            if key in self.initial_data:
                errors[key] = 'This form records notice acknowledgement, not consent or a user-selected lawful basis.'
        if attrs.get('enquiry_for') == 'ORGANISATION':
            if not attrs.get('organisation_name'):
                errors['organisation_name'] = 'Organisation name is required.'
            attrs['prospective_person_name'] = ''
            attrs['visitor_type'] = WalkInEnquiry.VisitorType.ORGANISATION_REPRESENTATIVE
        else:
            attrs['organisation_name'] = ''
            attrs['visitor_type'] = WalkInEnquiry.VisitorType.INDIVIDUAL
        if attrs.get('enquiry_for') == 'OTHER' and not attrs.get('prospective_person_name'):
            errors['prospective_person_name'] = 'Prospective person name is required.'
        if attrs.get('enquiry_for') == 'SELF':
            attrs['prospective_person_name'] = ''
            attrs['visitor_capacity'] = ''
            if attrs.get('authority_status') != 'NOT_REQUIRED':
                errors['authority_status'] = 'Self enquiries must use not required.'
        else:
            if not attrs.get('visitor_capacity'):
                errors['visitor_capacity'] = 'Relationship or capacity is required.'
            if attrs.get('authority_status') == 'NOT_REQUIRED':
                errors['authority_status'] = 'Select claimed, confirmed or pending authority for a representative.'
        if attrs.get('urgency_type', 'NONE') != 'NONE':
            if not attrs.get('urgency_note'):
                errors['urgency_note'] = 'A brief urgency note is required when urgency is selected.'
        else:
            attrs['urgency_note'] = ''
        if 'received_at' in attrs:
            if attrs['received_at'] > timezone.now() + timedelta(minutes=5):
                errors['received_at'] = 'Received time cannot be more than five minutes in the future.'
            if not attrs.get('received_at_reason'):
                errors['received_at_reason'] = 'A reason is required for an entered or corrected received time.'
        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class WalkInCorrectionSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.full_name', read_only=True)

    class Meta:
        model = WalkInEnquiryCorrection
        fields = ['id', 'actor_name', 'recorded_at', 'reason', 'previous_values', 'replacement_values', 'revision']
        read_only_fields = fields
