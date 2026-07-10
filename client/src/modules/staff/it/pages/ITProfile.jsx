import StaffProfilePage from '@/modules/staff/common/pages/StaffProfilePage';
import { staffRoleConfigs } from '@/modules/staff/common/config/staffRoleConfigs';

export default function ITProfile() {
  return <StaffProfilePage config={staffRoleConfigs.it} />;
}
