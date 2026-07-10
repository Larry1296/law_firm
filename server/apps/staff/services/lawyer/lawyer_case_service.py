from apps.cases.services import CaseService


class LawyerCaseService:
    @staticmethod
    def list_cases(user):
        if not hasattr(user, "lawyer_profile"):
            raise ValueError("Only lawyers can access this endpoint.")
        return CaseService.list_cases(user)

    @classmethod
    def get_case(cls, user, case_id):
        try:
            return CaseService.get_case(user, case_id)
        except Exception:
            return None
