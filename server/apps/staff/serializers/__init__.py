from .admin.lawyers.admin_lawyer_list_serializer import AdminLawyerListSerializer
from .admin.lawyers.admin_lawyer_detail_serializer import AdminLawyerDetailSerializer
from .admin.lawyers.admin_lawyer_create_serializer import AdminLawyerCreateSerializer
from .admin.lawyers.admin_lawyer_update_serializer import AdminLawyerUpdateSerializer
from .admin.lawyers.admin_lawyer_change_status_serializer import AdminLawyerChangeStatusSerializer

__all__ = [
    "AdminLawyerListSerializer",
    "AdminLawyerDetailSerializer",
    "AdminLawyerCreateSerializer",
    "AdminLawyerUpdateSerializer",
    "AdminLawyerChangeStatusSerializer",
]
