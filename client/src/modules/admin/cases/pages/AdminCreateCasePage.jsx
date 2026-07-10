import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from '@/core/utils/themedSwal';

import Card from '@/components/ui/Card';
import Button3D from '@/components/ui/Button3D';
import SectionHeading from '@/components/ui/SectionHeading';
import FloatingInput from '@/components/ui/FloatingInput';

import useAdminCreateCase from '@/modules/admin/cases/hooks/useAdminCreateCase';
import useAdminClients from '@/modules/admin/clients/hooks/useAdminClients';
import useFirmLawyers from '@/modules/admin/cases/hooks/useFirmLawyers';
import useFirmSecretaries from '@/modules/admin/cases/hooks/useFirmSecretaries';

const CASE_TYPES = [
  { value: 'CIVIL', label: 'Civil' },
  { value: 'CRIMINAL', label: 'Criminal' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'LAND', label: 'Land' },
  { value: 'EMPLOYMENT', label: 'Employment' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'SUCCESSION', label: 'Succession' },
  { value: 'CONSTITUTIONAL', label: 'Constitutional' },
  { value: 'TAX', label: 'Tax' },
  { value: 'IMMIGRATION', label: 'Immigration' },
];

const COURT_TYPES = [
  { value: 'MAGISTRATE', label: 'Magistrate Court' },
  { value: 'HIGH_COURT', label: 'High Court' },
  { value: 'COURT_OF_APPEAL', label: 'Court of Appeal' },
  { value: 'SUPREME_COURT', label: 'Supreme Court' },
  { value: 'ENVIRONMENT_LAND', label: 'Environment & Land Court' },
  { value: 'EMPLOYMENT_LABOUR', label: 'Employment & Labour Court' },
  { value: 'SMALL_CLAIMS', label: 'Small Claims Court' },
  { value: 'KADHI', label: 'Kadhi Court' },
];

export default function AdminCreateCasePage() {
  const navigate = useNavigate();

  const { createCase } = useAdminCreateCase();
  const { clients = [] } = useAdminClients();
  const { lawyers = [] } = useFirmLawyers();
  const { secretaries = [] } = useFirmSecretaries();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedLawyerId, setSelectedLawyerId] = useState('');
  const [selectedSecretaryId, setSelectedSecretaryId] = useState('');

  const [formData, setFormData] = useState({
    case_number: '',
    title: '',
    description: '',
    case_type: '',
    court_type: '',
    priority: 'MEDIUM',
    filing_date: '',
    court_name: '',
    court_location: '',
    defendant: '',
  });

  const sortedClients = useMemo(() => {
    return [...clients].sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
    );
  }, [clients]);

  const selectedClient = useMemo(() => {
    return sortedClients.find((c) => c.client_id === selectedClientId);
  }, [sortedClients, selectedClientId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const fieldClass = `
  w-full px-4 py-3 rounded-xl border
  bg-surface-light dark:bg-surface-dark
  text-text-primary-light dark:text-text-primary-dark
  border-border-light dark:border-border-dark
  focus:outline-none focus:ring-2 focus:ring-brand-primary
  transition
`;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedClientId) {
      return Swal.fire({
        icon: 'warning',
        title: 'Client Required',
        text: 'Please select a client.',
      });
    }

    try {
      setIsSubmitting(true);

      const payload = {
        ...formData,
        client_id: selectedClientId,
        plaintiff: selectedClient?.full_name || '',
        assigned_lawyer_membership_id: selectedLawyerId || null,
        assigned_secretary_membership_id: selectedSecretaryId || null,
      };

      await createCase(payload);

      await Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Case created successfully.',
        timer: 2000,
        showConfirmButton: false,
      });

      navigate('/admin/cases');
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error?.response?.data?.message ||
          JSON.stringify(error?.response?.data?.errors) ||
          error?.message ||
          'Failed to create case.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='space-y-6 p-4 md:p-6'>
      <SectionHeading
        title='Create Case'
        subtitle='Add a new legal case to the system'
      />

      <Card className='p-6'>
        <form onSubmit={handleSubmit} className='space-y-5'>
          {/* CLIENT */}
          <div>
            <label className='block mb-2 text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
              Client
            </label>

            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className={fieldClass}
              style={{
                colorScheme: document.documentElement.classList.contains('dark')
                  ? 'dark'
                  : 'light',
              }}
              required
            >
              <option value=''>Select Client</option>

              {sortedClients.map((c) => (
                <option key={c.client_id} value={c.client_id}>
                  {c.full_name || 'Unnamed'}{' '}
                  {c.national_id ? `(${c.national_id})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* CASE TYPE */}
          <div>
            <label className='block mb-2 text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
              Case Type
            </label>

            <select
              name='case_type'
              value={formData.case_type}
              onChange={handleChange}
              className={fieldClass}
              style={{
                colorScheme: document.documentElement.classList.contains('dark')
                  ? 'dark'
                  : 'light',
              }}
              required
            >
              <option value=''>Select Case Type</option>

              {CASE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* COURT TYPE */}
          <div>
            <label className='block mb-2 text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
              Court Type
            </label>

            <select
              name='court_type'
              value={formData.court_type}
              onChange={handleChange}
              className={fieldClass}
              style={{
                colorScheme: document.documentElement.classList.contains('dark')
                  ? 'dark'
                  : 'light',
              }}
              required
            >
              <option value=''>Select Court Type</option>

              {COURT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* LAWYERS */}
          <div>
            <label className='block mb-2 text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
              Assigned Lawyer
            </label>

            <select
              value={selectedLawyerId}
              onChange={(e) => setSelectedLawyerId(e.target.value)}
              className={fieldClass}
              style={{
                colorScheme: document.documentElement.classList.contains('dark')
                  ? 'dark'
                  : 'light',
              }}
            >
              <option value=''>Use firm assignment</option>

              {lawyers.map((l) => (
                <option key={l.membership_id} value={l.membership_id}>
                  {l.full_name}
                  {l.is_system_admin ? ' (Admin)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* SECRETARIES */}
          <div>
            <label className='block mb-2 text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
              Assigned Secretary
            </label>

            <select
              value={selectedSecretaryId}
              onChange={(e) => setSelectedSecretaryId(e.target.value)}
              className={fieldClass}
              style={{
                colorScheme: document.documentElement.classList.contains('dark')
                  ? 'dark'
                  : 'light',
              }}
            >
              <option value=''>Use firm assignment</option>

              {secretaries.map((s) => (
                <option key={s.membership_id} value={s.membership_id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* CASE FIELDS */}

          <FloatingInput
            label='Case Number'
            name='case_number'
            value={formData.case_number}
            onChange={handleChange}
            required
          />

          <FloatingInput
            label='Title'
            name='title'
            value={formData.title}
            onChange={handleChange}
            required
          />

          <FloatingInput
            label='Description'
            name='description'
            value={formData.description}
            onChange={handleChange}
            required
          />

          <FloatingInput
            label='Filing Date'
            name='filing_date'
            type='date'
            value={formData.filing_date}
            onChange={handleChange}
            noFloat
            required
          />

          <FloatingInput
            label='Court Name'
            name='court_name'
            value={formData.court_name}
            onChange={handleChange}
            required
          />

          <FloatingInput
            label='Court Location'
            name='court_location'
            value={formData.court_location}
            onChange={handleChange}
            required
          />

          <FloatingInput
            label='Defendant'
            name='defendant'
            value={formData.defendant}
            onChange={handleChange}
            required
          />

          {selectedClient && (
            <FloatingInput
              label='Plaintiff'
              value={selectedClient.full_name}
              disabled
              required
            />
          )}

          <div className='flex gap-3 pt-4'>
            <Button3D
              type='button'
              variant='secondary'
              onClick={() => navigate('/admin/cases')}
            >
              Cancel
            </Button3D>

            <Button3D type='submit' variant='primary' disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Case'}
            </Button3D>
          </div>
        </form>
      </Card>
    </div>
  );
}
