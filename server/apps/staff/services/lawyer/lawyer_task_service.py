class LawyerTaskService:
    @staticmethod
    def list_tasks(user):
        if not hasattr(user, "lawyer_profile"):
            raise ValueError("Only lawyers can access this endpoint.")

        return [
            {
                "id": "task-001",
                "title": "Prepare draft pleadings",
                "due_date": "2026-07-08",
                "status": "PENDING",
            }
        ]
