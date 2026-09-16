from rest_framework import serializers
from apps.clients.models import Client, ClientRepresentative
from apps.clients.onboarding_metadata import CANONICAL_CLIENT_TYPES
from apps.clients.prospective_metadata import PROSPECTIVE_PROFILES, REPRESENTATIVE_TYPES
from apps.clients.services.onboarding_service import PROFILE_MODELS


class StrictSerializer(serializers.Serializer):
    def to_internal_value(self, data):
        if isinstance(data, dict):
            unknown = set(data) - set(self.fields)
            if unknown:
                raise serializers.ValidationError({key: "This field is not accepted during prospective-client creation." for key in sorted(unknown)})
        return super().to_internal_value(data)


class PreliminaryRepresentativeSerializer(StrictSerializer):
    full_legal_name = serializers.CharField(max_length=255)
    representative_category = serializers.ChoiceField(choices=ClientRepresentative.RepresentativeCategory.choices)
    role_title = serializers.CharField(max_length=255)
    email = serializers.EmailField(required=False, allow_blank=True)
    telephone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    is_portal_contact = serializers.BooleanField(default=False)


class ProspectivePrivacySerializer(StrictSerializer):
    privacy_notice_delivered = serializers.BooleanField()
    delivery_method = serializers.ChoiceField(choices=['PAPER', 'EMAIL', 'SMS', 'VERBAL', 'PORTAL'])
    acknowledged = serializers.BooleanField(default=False)
    acknowledgement_reference = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate_privacy_notice_delivered(self, value):
        if not value:
            raise serializers.ValidationError("Record delivery of the privacy notice before saving.")
        return value


class ProspectiveClientCreateSerializer(StrictSerializer):
    full_name = serializers.CharField(max_length=255)
    client_type = serializers.ChoiceField(choices=CANONICAL_CLIENT_TYPES)
    access_type = serializers.ChoiceField(choices=[Client.AccessType.ASSISTED, Client.AccessType.PORTAL_ENABLED], default=Client.AccessType.ASSISTED)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=30, required=False, allow_blank=True)
    alternative_names = serializers.CharField(max_length=255, required=False, allow_blank=True)
    acting_for_self = serializers.BooleanField(default=True)
    legal_profile = serializers.DictField(default=dict)
    representative = PreliminaryRepresentativeSerializer(required=False, allow_null=True)
    provisional_legal_description = serializers.CharField(required=False, allow_blank=True)
    classification_review_reason = serializers.CharField(required=False, allow_blank=True)
    classification_evidence_reference = serializers.CharField(max_length=255, required=False, allow_blank=True)
    privacy = ProspectivePrivacySerializer()

    def validate(self, attrs):
        kind = attrs['client_type']
        schema = PROSPECTIVE_PROFILES[kind]
        profile = attrs['legal_profile']
        allowed = {item['key']: item for item in schema['fields']}
        if set(profile) - set(allowed):
            raise serializers.ValidationError({'legal_profile': 'Contains fields incompatible with this category or initial creation.'})
        model = PROFILE_MODELS.get(kind)
        for key, spec in allowed.items():
            value = profile.get(key, '')
            if spec['required'] and not str(value).strip():
                raise serializers.ValidationError({'legal_profile': {key: 'This field is required.'}})
            if key in profile:
                model_field = model._meta.get_field(key)
                options = [item['value'] for item in spec.get('options', [])]
                if options and value not in options:
                    raise serializers.ValidationError({'legal_profile': {key: 'Select a supported value.'}})
                profile[key] = serializers.CharField(max_length=model_field.max_length, allow_blank=not spec['required']).run_validation(value)
        classification = ('provisional_legal_description', 'classification_review_reason', 'classification_evidence_reference')
        if kind == Client.ClientType.OTHER_REQUIRES_REVIEW:
            for key in classification[:2]:
                if not attrs.get(key):
                    raise serializers.ValidationError({key: 'This field is required for unresolved classification.'})
        elif any(attrs.get(key) for key in classification):
            raise serializers.ValidationError({'client_type': 'Classification-review fields only apply to Other.'})
        rep = attrs.get('representative')
        required_rep = kind not in ('INDIVIDUAL', 'SOLE_PROPRIETORSHIP', 'OTHER_REQUIRES_REVIEW') or (kind == 'INDIVIDUAL' and not attrs['acting_for_self'])
        if required_rep and not rep:
            raise serializers.ValidationError({'representative': 'Record the preliminary representative and capacity.'})
        if rep and rep['representative_category'] not in REPRESENTATIVE_TYPES[kind]:
            raise serializers.ValidationError({'representative': 'This capacity is incompatible with the selected category.'})
        if kind == 'INDIVIDUAL' and attrs['acting_for_self'] and rep:
            raise serializers.ValidationError({'representative': 'Select acting through a representative before recording one.'})
        if attrs['access_type'] == Client.AccessType.PORTAL_ENABLED:
            if kind == 'INDIVIDUAL':
                if not attrs.get('email'):
                    raise serializers.ValidationError({'email': 'Portal-enabled individuals require an email.'})
            elif not rep or not rep.get('is_portal_contact') or not rep.get('email'):
                raise serializers.ValidationError({'representative': 'Select an authorised portal contact with an email.'})
        elif rep and rep.get('is_portal_contact'):
            raise serializers.ValidationError({'representative': 'Firm-managed clients do not have a portal contact.'})
        return attrs
