"""Administrative enquiry tasks. They do not require or create a legal matter."""
import uuid
from django.db import models
from django.utils import timezone


class Task(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enquiry = models.ForeignKey('clients.WalkInEnquiry', on_delete=models.PROTECT, related_name='administrative_tasks')
    kind = models.CharField(max_length=30, choices=[('MINIMUM_INFORMATION', 'Minimum information'), ('AUTHORISED_CREATION', 'Authorised creation')])
    assigned_to = models.ForeignKey('users.User', on_delete=models.PROTECT, related_name='enquiry_tasks')
    created_by = models.ForeignKey('users.User', on_delete=models.PROTECT, related_name='+')
    created_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True)
    status = models.CharField(max_length=20, default='PENDING', choices=[('PENDING', 'Pending'), ('DONE', 'Done'), ('CANCELLED', 'Cancelled')])

    class Meta:
        constraints = [models.UniqueConstraint(fields=['enquiry'], condition=models.Q(status='PENDING'), name='one_pending_enquiry_task')]

    @property
    def title(self):
        return f'{self.get_kind_display()} — {self.enquiry.reference}'
