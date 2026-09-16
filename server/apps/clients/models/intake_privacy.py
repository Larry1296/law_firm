from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone
from .onboarding_domain import ClientPrivacyRecord


class PrivacyConfigQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise ValidationError('Privacy configurations must be changed through the audited lifecycle service.')

    def delete(self):
        raise ValidationError('Privacy configuration history cannot be deleted.')

    def bulk_update(self, *args, **kwargs):
        raise ValidationError('Privacy configurations cannot be bulk updated.')


class IntakePrivacyConfig(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        ACTIVE = 'ACTIVE', 'Active'
        RETIRED = 'RETIRED', 'Retired'

    firm = models.ForeignKey('firm.LawFirm', on_delete=models.PROTECT, related_name='intake_privacy_configs')
    policy_version = models.CharField(max_length=50)
    notice_text = models.TextField()
    lawful_basis = models.CharField(max_length=50, choices=ClientPrivacyRecord.LawfulBasis.choices)
    effective_date = models.DateField(default=timezone.localdate)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    approved_by = models.ForeignKey('users.User', on_delete=models.PROTECT, null=True, blank=True, related_name='+')
    approved_at = models.DateTimeField(null=True, blank=True)
    activated_by = models.ForeignKey('users.User', on_delete=models.PROTECT, null=True, blank=True, related_name='+')
    activated_at = models.DateTimeField(null=True, blank=True)
    retired_by = models.ForeignKey('users.User', on_delete=models.PROTECT, null=True, blank=True, related_name='+')
    retired_at = models.DateTimeField(null=True, blank=True)
    objects = PrivacyConfigQuerySet.as_manager()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['firm', 'policy_version'], name='unique_firm_privacy_version'),
            models.UniqueConstraint(fields=['firm'], condition=models.Q(status='ACTIVE'), name='one_active_firm_privacy'),
            models.CheckConstraint(condition=~models.Q(status='ACTIVE') | models.Q(approved_by__isnull=False, approved_at__isnull=False, activated_by__isnull=False, activated_at__isnull=False), name='active_privacy_requires_approval'),
        ]

    @transaction.atomic
    def save(self, *args, **kwargs):
        if self.pk:
            previous = type(self).objects.select_for_update().get(pk=self.pk)
            if previous.activated_at or previous.status == self.Status.RETIRED:
                allowed = {'status', 'retired_by_id', 'retired_at'} if previous.status == self.Status.ACTIVE and self.status == self.Status.RETIRED else set()
                if any(getattr(previous, f.attname) != getattr(self, f.attname) for f in self._meta.concrete_fields if f.attname not in allowed):
                    raise ValidationError('Activated privacy versions cannot be edited. Create a new version.')
            if previous.firm_id != self.firm_id:
                raise ValidationError('A privacy version cannot move between firms.')
        # Legacy activated versions predate stored notice text; preserve them verbatim.
        legacy_notice = self.pk and previous.activated_at and not previous.notice_text and not self.notice_text
        self.full_clean(exclude=['notice_text'] if legacy_notice else None)
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError('Privacy configuration history cannot be deleted.')

    @classmethod
    def active_for(cls, firm):
        return cls.objects.filter(firm=firm, status=cls.Status.ACTIVE, effective_date__lte=timezone.localdate(),
                                 approved_by__isnull=False, approved_at__lte=timezone.now()).exclude(policy_version='').filter(
                                     lawful_basis__in=ClientPrivacyRecord.LawfulBasis.values).first()
