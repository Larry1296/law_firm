from django.db import transaction
from apps.firm.models import FirmSetting


class FirmSettingService:

    @staticmethod
    @transaction.atomic
    def get_settings(firm):
        return FirmSetting.objects.get_or_create(firm=firm)[0]

    @staticmethod
    @transaction.atomic
    def update_settings(*, firm, validated_data):
        settings = FirmSetting.objects.get_or_create(firm=firm)[0]

        for attr, value in validated_data.items():
            setattr(settings, attr, value)

        settings.save()
        return settings