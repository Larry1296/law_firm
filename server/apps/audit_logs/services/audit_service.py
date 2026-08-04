import uuid
from datetime import date, datetime
from decimal import Decimal

from django.db.models import Model

from apps.audit_logs.models import AuditEvent


def _json_value(value):
    if isinstance(value, Model):
        return str(value.pk)
    if isinstance(value, (datetime, date, Decimal, uuid.UUID)):
        return str(value)
    if isinstance(value, dict):
        return {str(key): _json_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_json_value(item) for item in value]
    return value


class AuditService:
    @staticmethod
    def role_for(user):
        if not user:
            return "SYSTEM"
        for profile_name in ("lawyer_profile", "secretary_profile", "accountant_profile", "hr_profile", "it_profile"):
            profile = getattr(user, profile_name, None)
            if profile:
                return getattr(profile, "firm_role", user.role)
        return user.role

    @classmethod
    def record(cls, *, firm, user, action, obj, previous=None, new=None, reason="", correlation_id=""):
        return AuditEvent.objects.create(
            firm=firm, user=user, role=cls.role_for(user), action=action,
            object_type=obj._meta.label, object_identifier=str(obj.pk),
            previous_values=_json_value(previous or {}), new_values=_json_value(new or {}),
            reason=reason, correlation_identifier=str(correlation_id or ""),
        )
