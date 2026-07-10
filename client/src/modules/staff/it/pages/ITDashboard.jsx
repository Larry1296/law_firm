import StaffDashboardPage from '@/modules/staff/common/pages/StaffDashboardPage';
import { staffRoleConfigs } from '@/modules/staff/common/config/staffRoleConfigs';

export default function ITDashboard() {
  return <StaffDashboardPage config={staffRoleConfigs.it} />;
}
