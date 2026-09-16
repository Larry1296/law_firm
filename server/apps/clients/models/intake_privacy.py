from django.db import models
from .onboarding_domain import ClientPrivacyRecord


class IntakePrivacyConfig(models.Model):
    firm = models.OneToOneField("firm.LawFirm", on_delete=models.PROTECT, related_name="intake_privacy")
    policy_version = models.CharField(max_length=50)
    lawful_basis = models.CharField(max_length=50, choices=ClientPrivacyRecord.LawfulBasis.choices)
    is_active = models.BooleanField(default=False)
    approved_by = models.ForeignKey("users.User", on_delete=models.PROTECT, null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    @classmethod
    def active_for(cls, firm):
        from django.utils import timezone
        return cls.objects.filter(firm=firm, is_active=True, approved_by__isnull=False,
                                  approved_at__lte=timezone.now()).exclude(policy_version="").filter(
                                      lawful_basis__in=ClientPrivacyRecord.LawfulBasis.values).first()
