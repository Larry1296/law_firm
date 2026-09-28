from apps.cases.services.my_work_service import MyWorkService


class LawyerTaskService:
    @staticmethod
    def list_tasks(user):
        if not hasattr(user, "lawyer_profile"):
            raise ValueError("Only lawyers can access this endpoint.")
        return MyWorkService.items(user)
