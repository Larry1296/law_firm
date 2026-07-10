import { useState } from 'react';
import { Lock } from 'lucide-react';

import Button3D from '@/components/ui/Button3D';
import Card from '@/components/ui/Card';
import FloatingInput from '@/components/ui/FloatingInput';
import SectionHeading from '@/components/ui/SectionHeading';
import Swal from '@/core/utils/themedSwal';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import staffWorkspaceService from '@/modules/staff/common/services/staffWorkspaceService';

export default function StaffSecurityPage({ config }) {
  const [form, setForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [loading, setLoading] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      await staffWorkspaceService.changePassword(config.apiBase, form);
      setForm({ old_password: '', new_password: '', confirm_password: '' });
      await Swal.fire({
        icon: 'success',
        title: 'Password updated',
        text: 'Your password has been changed successfully.',
      });
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Could not update password',
        text: getApiErrorMessage(error, 'Please check your password details.'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='p-4 sm:p-6 lg:p-8 space-y-6'>
      <SectionHeading
        title='Security'
        subtitle='Change your password and keep your workspace protected.'
        icon={Lock}
      />

      <Card className='p-6 max-w-xl'>
        <form onSubmit={handleSubmit} className='space-y-5'>
          <FloatingInput
            label='Current Password'
            type='password'
            value={form.old_password}
            onChange={(event) => updateField('old_password', event.target.value)}
          />
          <FloatingInput
            label='New Password'
            type='password'
            value={form.new_password}
            onChange={(event) => updateField('new_password', event.target.value)}
          />
          <FloatingInput
            label='Confirm New Password'
            type='password'
            value={form.confirm_password}
            onChange={(event) => updateField('confirm_password', event.target.value)}
          />

          <Button3D type='submit' disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </Button3D>
        </form>
      </Card>
    </div>
  );
}
