from apps.staff.models import SecretaryPermission
class SecretaryTaskService:
    @staticmethod
    def list_tasks(user):
        secretary = getattr(user, 'secretary_profile', None)
        if secretary is None:
            raise ValueError('Only secretaries can access this endpoint.')
        if not secretary.has_permission(SecretaryPermission.MANAGE_TASKS):
            raise PermissionError('Admin permission is required to manage tasks.')
        return []
