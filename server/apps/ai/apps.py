from django.apps import AppConfig


class AiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = 'apps.ai'
    verbose_name = "AI and Knowledge Base"

    def ready(self):
        from . import signals  # noqa: F401
