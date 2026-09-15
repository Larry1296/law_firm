from rest_framework import serializers
from apps.clients.models import PreliminaryReview, WalkInEnquiry

IDENTIFICATION_FIELDS = ['prospective_name', 'entity_kind', 'visitor_capacity', 'adverse_parties', 'related_parties']
REVIEW_FIELDS = IDENTIFICATION_FIELDS + ['service_category', 'working_title', 'forum', 'urgency', 'critical_date', 'preliminary_note']


class StrictSerializer(serializers.Serializer):
    def to_internal_value(self, data):
        if not isinstance(data, dict) or set(data) - set(self.fields):
            raise serializers.ValidationError('Only the fields shown for this operation are allowed.')
        return super().to_internal_value(data)


class PartyInput(StrictSerializer):
    name = serializers.CharField(max_length=255)
    party_type = serializers.ChoiceField(choices=['PERSON', 'ORGANISATION'])


class ReviewInput(StrictSerializer):
    prospective_name = serializers.CharField(max_length=255)
    entity_kind = serializers.ChoiceField(choices=['PERSON', 'ORGANISATION'])
    visitor_capacity = serializers.CharField(max_length=255, allow_blank=True)
    adverse_parties = PartyInput(many=True)
    related_parties = PartyInput(many=True)
    service_category = serializers.CharField(max_length=100)
    working_title = serializers.CharField(max_length=255, allow_blank=True)
    forum = serializers.CharField(max_length=255, allow_blank=True)
    urgency = serializers.ChoiceField(choices=WalkInEnquiry.UrgencyType.choices)
    critical_date = serializers.DateField(allow_null=True)
    preliminary_note = serializers.CharField(max_length=500, allow_blank=True)

    def validate(self, attrs):
        if any(len(attrs.get(key, [])) > 50 for key in ['adverse_parties', 'related_parties']):
            raise serializers.ValidationError('Record at most 50 names in each party list.')
        return attrs


class AssignmentInput(StrictSerializer):
    lawyer_id = serializers.UUIDField()
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True, default='')
    revision = serializers.IntegerField(min_value=0, required=False)


class DecisionInput(StrictSerializer):
    revision = serializers.IntegerField(min_value=0)
    review = ReviewInput()
    outcome = serializers.ChoiceField(choices=PreliminaryReview.Outcome.choices)
    reason = serializers.CharField(max_length=500)
    execution = serializers.ChoiceField(choices=PreliminaryReview.Execution.choices, required=False)
    secretary_id = serializers.UUIDField(required=False, allow_null=True)
    missing_fields = serializers.ListField(child=serializers.ChoiceField(choices=IDENTIFICATION_FIELDS), required=False, default=list)

    def validate(self, attrs):
        proceed = attrs['outcome'] == 'PROCEED_TO_CONFLICT_SCREENING'
        information = attrs['outcome'] == 'REQUEST_MINIMUM_INFORMATION'
        if proceed and (not attrs.get('execution') or not attrs['review']['working_title']):
            raise serializers.ValidationError('Proceed requires a working title and execution choice.')
        if not proceed and attrs.get('execution'):
            raise serializers.ValidationError('Only proceed can authorise creation.')
        if information != bool(attrs['missing_fields']):
            raise serializers.ValidationError('Specify missing identification/party fields only when requesting minimum information.')
        if attrs.get('secretary_id') and not (information or attrs.get('execution') == 'ASSIGN_CREATION_TO_SECRETARY'):
            raise serializers.ValidationError('Secretary assignment is only for follow-up or authorised creation.')
        if attrs.get('execution') == 'ASSIGN_CREATION_TO_SECRETARY' and not attrs.get('secretary_id'):
            raise serializers.ValidationError('Choose a secretary for authorised creation.')
        return attrs


class FollowUpInput(StrictSerializer):
    revision = serializers.IntegerField(min_value=0)
    changes = serializers.DictField(allow_empty=False)


class ConversionInput(StrictSerializer):
    existing_client_id = serializers.UUIDField(required=False)
    identity_verified = serializers.BooleanField(required=False, default=False)
    verification_reason = serializers.CharField(max_length=300, required=False, allow_blank=True, default='')

    def validate(self, attrs):
        if attrs.get('existing_client_id') and not (attrs['identity_verified'] and attrs['verification_reason']):
            raise serializers.ValidationError('Verify that this is the same person/entity and record the basis before linking an existing prospect.')
        return attrs


class PhysicalFileInput(StrictSerializer):
    revision = serializers.IntegerField(min_value=0)
    reference = serializers.CharField(max_length=80)
    opened_date = serializers.DateField()
    location = serializers.CharField(max_length=255)
    custody_holder_id = serializers.UUIDField()
    reason = serializers.CharField(max_length=500)
