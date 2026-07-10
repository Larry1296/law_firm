from django.apps import AppConfig
from django.db.models.signals import post_migrate


class FirmConfig(AppConfig):
    name = "apps.firm"

    def ready(self):
        from .bootstrap import ensure_default_firm
        post_migrate.connect(ensure_default_firm, sender=self)