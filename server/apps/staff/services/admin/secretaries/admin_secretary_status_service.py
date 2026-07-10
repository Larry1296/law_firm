from django.utils import timezone

from apps.common.choices import EmploymentStatus


class AdminSecretaryStatusService:
    @staticmethod
    def activate_secretary(*, secretary, updated_by):
        secretary.is_active = True
        secretary.employment_status = EmploymentStatus.ACTIVE
        secretary.date_terminated = None
        secretary.termination_reason = None
        secretary.user.is_active = True
        secretary.user.save(update_fields=["is_active"])
        secretary.save()
        return secretary

    @staticmethod
    def deactivate_secretary(*, secretary, updated_by):
        secretary.is_active = False
        secretary.employment_status = EmploymentStatus.SUSPENDED
        secretary.user.is_active = False
        secretary.user.save(update_fields=["is_active"])
        secretary.save()
        return secretary

    @staticmethod
    def change_status(*, secretary, employment_status, updated_by, termination_reason=None):
        secretary.employment_status = employment_status

        if employment_status == EmploymentStatus.TERMINATED:
            secretary.is_active = False
            secretary.date_terminated = timezone.now().date()
            secretary.termination_reason = termination_reason
            secretary.user.is_active = False

        elif employment_status == EmploymentStatus.ACTIVE:
            secretary.is_active = True
            secretary.date_terminated = None
            secretary.termination_reason = None
            secretary.user.is_active = True

        secretary.user.save(update_fields=["is_active"])
        secretary.save()
        return secretary
