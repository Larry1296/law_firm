import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class ImmutableAuditQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise ValidationError("Audit events are immutable.")

    def delete(self):
        raise ValidationError("Audit events cannot be deleted.")


class AuditEvent(models.Model):
    objects = ImmutableAuditQuerySet.as_manager()
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firm = models.ForeignKey("firm.LawFirm", on_delete=models.PROTECT, related_name="audit_events")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, related_name="audit_events")
    role = models.CharField(max_length=60, blank=True, default="")
    action = models.CharField(max_length=120, db_index=True)
    object_type = models.CharField(max_length=160, db_index=True)
    object_identifier = models.CharField(max_length=160, db_index=True)
    previous_values = models.JSONField(default=dict)
    new_values = models.JSONField(default=dict)
    reason = models.TextField(blank=True, default="")
    correlation_identifier = models.CharField(max_length=160, blank=True, default="", db_index=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "audit_events"
        ordering = ["-timestamp", "-id"]
        indexes = [models.Index(fields=["firm", "object_type", "object_identifier"])]

    def save(self, *args, **kwargs):
        if self.pk and type(self).objects.filter(pk=self.pk).exists():
            raise ValidationError("Audit events are immutable.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Audit events cannot be deleted.")
