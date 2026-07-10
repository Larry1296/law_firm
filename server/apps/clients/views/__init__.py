from .client_admin_assign_view import ClientAdminAssignView
from .client_admin_dashboard_view import ClientAdminDashboardView
from .client_admin_delete_view import ClientAdminDeleteView
from .client_admin_detail_view import ClientAdminDetailView
from .client_admin_lawyers_view import ClientAdminLawyersView
from .client_admin_list_view import ClientAdminListView
from .client_admin_remove_lawyer_view import ClientAdminRemoveLawyerView
from .client_admin_statistics_view import ClientAdminStatisticsView
from .client_admin_status_view import ClientAdminStatusView
from .client_detail_view import ClientDetailView
from .client_list_view import ClientListView
from .company_client_create_view import CompanyClientCreateView
from .individual_client_create_view import IndividualClientCreateView

__all__ = [
    "ClientListView",
    "ClientDetailView",
    "IndividualClientCreateView",
    "CompanyClientCreateView",
    "ClientAdminListView",
    "ClientAdminDetailView",
    "ClientAdminStatusView",
    "ClientAdminDashboardView",
    "ClientAdminStatisticsView",
    "ClientAdminLawyersView",
    "ClientAdminAssignView",
    "ClientAdminRemoveLawyerView",
    "ClientAdminDeleteView",
]