from apps.staff.models import SecretaryPermission
from apps.tasks.models import Task


class SecretaryTaskService:
    @staticmethod
    def list_tasks(user):
        secretary = getattr(user, 'secretary_profile', None)
        if secretary is None:
            raise ValueError('Only secretaries can access this endpoint.')
        if not secretary.has_permission(SecretaryPermission.MANAGE_TASKS):
            raise PermissionError('Admin permission is required to manage tasks.')
        # Administrative enquiry tasks contain references, never legal narratives.
        from apps.clients.services.walk_in_enquiry_service import WalkInEnquiryService
        firm = WalkInEnquiryService.firm_for(user, 'secretary')
        return [{
            'id': str(task.pk), 'title': task.title, 'priority': 'MEDIUM', 'status': task.status,
            'due_date': '', 'assigned_by': task.created_by.full_name,
        } for task in Task.objects.filter(enquiry__firm=firm, assigned_to=user, status='PENDING')
              .select_related('enquiry', 'created_by')]
