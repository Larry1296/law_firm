from django.apps import AppConfig


class SubscriptionsConfig(AppConfig):
    name = "apps.subscriptions"
    verbose_name = "SaaS subscriptions"

    def ready(self):
        from apps.subscriptions import signals  # noqa: F401
