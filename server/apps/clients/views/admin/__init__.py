from .client_admin_list_view import ClientAdminListView
from .client_admin_detail_view import ClientAdminDetailView
from .client_admin_status_view import ClientAdminStatusView
from .client_admin_dashboard_view import ClientAdminDashboardView
from .client_admin_statistics_view import ClientAdminStatisticsView
from .client_admin_lawyers_view import ClientAdminLawyersView
from .client_admin_assign_view import ClientAdminAssignView
from .client_admin_remove_lawyer_view import ClientAdminRemoveLawyerView
from .client_admin_delete_view import ClientAdminDeleteView
from .individual_admin_create_client_view import IndividualAdminCreateClientView
from .company_admin_create_client_view import (
    CompanyAdminCreateClientView,
    CooperativeAdminCreateClientView,
    SaccoAdminCreateClientView,
)
from .partnership_admin_create_client_view import PartnershipAdminCreateClientView
from .ngo_admin_create_client_view import (
    AssociationAdminCreateClientView,
    NGOAdminCreateClientView,
    ReligiousOrganizationAdminCreateClientView,
)
from .trust_admin_create_client_view import TrustAdminCreateClientView
from .estate_admin_create_client_view import EstateAdminCreateClientView
from .government_admin_create_client_view import (
    EducationalInstitutionAdminCreateClientView,
    GovernmentAdminCreateClientView,
)

__all__ = [
    "ClientAdminListView",
    "ClientAdminDetailView",
    "ClientAdminStatusView",
    "ClientAdminDashboardView",
    "ClientAdminStatisticsView",
    "ClientAdminLawyersView",
    "ClientAdminAssignView",
    "ClientAdminRemoveLawyerView",
    "ClientAdminDeleteView",
    "IndividualAdminCreateClientView",
    "CompanyAdminCreateClientView",
    "CooperativeAdminCreateClientView",
    "SaccoAdminCreateClientView",
    "PartnershipAdminCreateClientView",
    "AssociationAdminCreateClientView",
    "NGOAdminCreateClientView",
    "ReligiousOrganizationAdminCreateClientView",
    "TrustAdminCreateClientView",
    "EstateAdminCreateClientView",
    "EducationalInstitutionAdminCreateClientView",
    "GovernmentAdminCreateClientView",
]
