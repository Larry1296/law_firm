from rest_framework import serializers

from apps.clients.models import (
    Client,
    PartnershipClient,
)


class PartnershipClientResponseSerializer(serializers.ModelSerializer):

    partnership_profile = serializers.SerializerMethodField()

    class Meta:
        model = Client

        fields = (
            "id",
            "client_type",
            "onboarding_type",
            "portal_enabled",
            "lifecycle_status",
            "is_active",
            "created_at",
            "updated_at",
            "partnership_profile",
        )

    def get_partnership_profile(self, obj):

        try:
            partnership = obj.partnership_profile

            return {
                "partnership_name": partnership.partnership_name,
                "registration_number": partnership.registration_number,
                "tax_pin": partnership.tax_pin,
                "formation_date": partnership.formation_date,
                "partner_count": partnership.partner_count,
                "agreement_type": partnership.agreement_type,
            }

        except PartnershipClient.DoesNotExist:
            return None