from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.firm.models import LawFirm
from apps.subscriptions.services import SubscriptionService


@receiver(post_save, sender=LawFirm, dispatch_uid="subscriptions.start_trial_for_new_firm")
def start_trial_for_new_firm(sender, instance, created, raw=False, **kwargs):
    if created and not raw:
        SubscriptionService.start_trial(instance)
