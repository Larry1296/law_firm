import StaffSecurityPage from '@/modules/staff/common/pages/StaffSecurityPage';
import { staffRoleConfigs } from '@/modules/staff/common/config/staffRoleConfigs';

export default function ITSecurity() {
  return <StaffSecurityPage config={staffRoleConfigs.it} />;
}
