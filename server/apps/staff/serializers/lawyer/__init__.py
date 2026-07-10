from .lawyer_profile_serializer import LawyerProfileSerializer
from .lawyer_dashboard_serializer import LawyerDashboardSerializer
from .lawyer_case_serializer import LawyerCaseSerializer
from .lawyer_client_serializer import LawyerClientSerializer
from .lawyer_document_serializer import LawyerDocumentSerializer
from .lawyer_calendar_serializer import LawyerCalendarEventSerializer
from .lawyer_notification_serializer import LawyerNotificationSerializer
from .lawyer_task_serializer import LawyerTaskSerializer
from .lawyer_change_password_serializer import LawyerChangePasswordSerializer

__all__ = [
    "LawyerProfileSerializer",
    "LawyerDashboardSerializer",
    "LawyerCaseSerializer",
    "LawyerClientSerializer",
    "LawyerDocumentSerializer",
    "LawyerCalendarEventSerializer",
    "LawyerNotificationSerializer",
    "LawyerTaskSerializer",
    "LawyerChangePasswordSerializer",
]
