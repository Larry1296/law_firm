import uuid

from django.db import models

from apps.common.models.timestamped_model import TimestampedModel


class FirmOnboardingRequest(TimestampedModel):
    """A law firm asking, from the public homepage, to be registered on the platform.

    While public self-service sign-up is closed, the platform administrator
    reviews these and registers the firm from the platform console.
    """

    class Status(models.TextChoices):
        NEW = "NEW", "New"
        CONTACTED = "CONTACTED", "Contacted"
        REGISTERED = "REGISTERED", "Registered"
        DECLINED = "DECLINED", "Declined"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm_name = models.CharField(max_length=255)
    contact_name = models.CharField(max_length=200)
    email = models.EmailField()
    phone_number = models.CharField(max_length=30)
    county = models.CharField(max_length=60, blank=True)
    advocates_count = models.PositiveIntegerField(null=True, blank=True)
    preferred_plan = models.CharField(max_length=30, blank=True)
    message = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    internal_notes = models.TextField(blank=True)
    registered_firm = models.ForeignKey(
        "firm.LawFirm", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="onboarding_requests",
    )

    class Meta:
        db_table = "platform_firm_onboarding_requests"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.firm_name} ({self.get_status_display()})"


class PlatformActivity(models.Model):
    """What platform administrators did, for the platform overview and accountability."""

    class Action(models.TextChoices):
        FIRM_REGISTERED = "FIRM_REGISTERED", "Firm registered"
        FIRM_UPDATED = "FIRM_UPDATED", "Firm details updated"
        FIRM_SUSPENDED = "FIRM_SUSPENDED", "Firm suspended"
        FIRM_REACTIVATED = "FIRM_REACTIVATED", "Firm reactivated"
        SUBSCRIPTION_UPDATED = "SUBSCRIPTION_UPDATED", "Subscription updated"
        OWNER_INVITED = "OWNER_INVITED", "Owner invitation sent"
        PAYMENT_CONFIRMED = "PAYMENT_CONFIRMED", "Payment confirmed"
        INVOICE_VOIDED = "INVOICE_VOIDED", "Invoice voided"
        PLAN_CREATED = "PLAN_CREATED", "Plan created"
        PLAN_UPDATED = "PLAN_UPDATED", "Plan updated"
        PLAN_DELETED = "PLAN_DELETED", "Plan deleted"
        USER_ACTIVATED = "USER_ACTIVATED", "User activated"
        USER_DEACTIVATED = "USER_DEACTIVATED", "User deactivated"
        REQUEST_UPDATED = "REQUEST_UPDATED", "Onboarding request updated"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, related_name="platform_activities",
    )
    action = models.CharField(max_length=40, choices=Action.choices, db_index=True)
    firm = models.ForeignKey(
        "firm.LawFirm", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="platform_activities",
    )
    summary = models.CharField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "platform_activities"
        ordering = ["-created_at"]

    def __str__(self):
        return self.summary

    @classmethod
    def record(cls, actor, action, summary, firm=None):
        return cls.objects.create(actor=actor, action=action, summary=summary[:500], firm=firm)
