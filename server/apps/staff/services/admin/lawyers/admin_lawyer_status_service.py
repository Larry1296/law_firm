from django.utils import timezone

from apps.common.choices import EmploymentStatus


class AdminLawyerStatusService:
    """
    Handles lawyer activation and employment status changes.
    """

    @staticmethod
    def activate_lawyer(*, lawyer, updated_by):
        lawyer.is_active = True
        lawyer.employment_status = EmploymentStatus.ACTIVE
        lawyer.date_terminated = None
        lawyer.termination_reason = None
        lawyer.save()

        return lawyer

    @staticmethod
    def deactivate_lawyer(*, lawyer, updated_by):
        lawyer.is_active = False
        lawyer.employment_status = EmploymentStatus.SUSPENDED
        lawyer.save()

        return lawyer

    @staticmethod
    def change_status(*, lawyer, employment_status, updated_by, termination_reason=None):
        lawyer.employment_status = employment_status

        if employment_status == EmploymentStatus.TERMINATED:
            lawyer.is_active = False
            lawyer.date_terminated = timezone.now().date()
            lawyer.termination_reason = termination_reason

        elif employment_status == EmploymentStatus.ACTIVE:
            lawyer.is_active = True
            lawyer.date_terminated = None
            lawyer.termination_reason = None

        lawyer.save()

        return lawyer