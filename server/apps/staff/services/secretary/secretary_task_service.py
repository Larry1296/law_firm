from apps.cases.services.my_work_service import MyWorkService


class SecretaryTaskService:
    @staticmethod
    def list_tasks(user):
        """A secretary always sees their own work; MANAGE_TASKS governs managing others' tasks."""
        if getattr(user, "secretary_profile", None) is None:
            raise ValueError("Only secretaries can access this endpoint.")
        return MyWorkService.items(user)
