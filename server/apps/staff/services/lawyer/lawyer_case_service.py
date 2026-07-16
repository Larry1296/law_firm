from django.core.exceptions import ObjectDoesNotExist

from apps.cases.services import CaseService


class LawyerCaseService:
    @staticmethod
    def list_cases(user, *, search=None, status=None, priority=None, case_type=None):
        if not hasattr(user, "lawyer_profile"):
            raise ValueError("Only lawyers can access this endpoint.")
        return CaseService.list_cases(
            user,
            search=search,
            status=status,
            priority=priority,
            case_type=case_type,
        )

    @classmethod
    def get_case(cls, user, case_id):
        try:
            return CaseService.get_case(user, case_id)
        except (ObjectDoesNotExist, ValueError, PermissionError):
            return None
