import StaffSecurityPage from '@/modules/staff/common/pages/StaffSecurityPage';
import lawyerSecurityService from '@/modules/staff/lawyer/security/services/lawyerSecurityService';

export default function LawyerSecurityPage() {
  return (
    <StaffSecurityPage
      submitPassword={({ old_password: currentPassword, new_password: newPassword, confirm_password: confirmPassword }) =>
        lawyerSecurityService.changePassword({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        })}
    />
  );
}
