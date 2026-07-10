import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from '@/core/utils/themedSwal';

import Card from '@/components/ui/Card';
import Button3D from '@/components/ui/Button3D';
import SectionHeading from '@/components/ui/SectionHeading';
import FloatingInput from '@/components/ui/FloatingInput';

import { useSecretaryClients } from '@/modules/staff/secretary/clients/hooks/useSecretaryClients';
import useSecretaryCreateCase from '@/modules/staff/secretary/cases/hooks/useSecretaryCreateCase';

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

export default function SecretaryCreateCasePage() {
  const navigate = useNavigate();

  const { clients, loading: clientsLoading } = useSecretaryClients();
  const { createCase, loading } = useSecretaryCreateCase();

  const [selectedClientId, setSelectedClientId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // normalize clients safely
  const sortedClients = useMemo(() => {
    if (!Array.isArray(clients)) return [];

    return [...clients].sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
    );
  }, [clients]);

  const selectedClient = useMemo(() => {
    return sortedClients.find((c) => String(c.id) === String(selectedClientId));
  }, [sortedClients, selectedClientId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedClientId) {
      return Swal.fire({
        icon: 'warning',
        title: 'Client Required',
        text: 'Please select a client first.',
      });
    }

    try {
      setIsSubmitting(true);

      await createCase({
        ...formData,
        client_id: selectedClientId,
        plaintiff: selectedClient?.full_name || '',
      });

      navigate('/secretary/cases');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass = `
    w-full px-4 py-3 rounded-xl border
    bg-surface-light dark:bg-surface-dark
    text-text-primary-light dark:text-text-primary-dark
    border-border-light dark:border-border-dark
    focus:outline-none focus:ring-2 focus:ring-brand-primary
    transition
  `;

  return (
    <div className='space-y-6 p-4 md:p-6'>
      <SectionHeading
        title='Create Case'
        subtitle='Create a new legal matter for your firm'
      />

      <Card className='p-6'>
        <form onSubmit={handleSubmit} className='space-y-5'>
          {/* CLIENT DROPDOWN */}
          <div>
            <label className='mb-2 block text-sm font-medium'>Client</label>

            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className={fieldClass}
              required
              disabled={clientsLoading}
            >
              <option value=''>
                {clientsLoading ? 'Loading clients...' : 'Select Client'}
              </option>

              {sortedClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.full_name}
                  {client.national_id ? ` (${client.national_id})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* CASE TYPE */}
          <div>
            <label className='mb-2 block text-sm font-medium'>Case Type</label>

            <select
              name='case_type'
              value={formData.case_type}
              onChange={handleChange}
              className={fieldClass}
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
            <label className='mb-2 block text-sm font-medium'>Court Type</label>

            <select
              name='court_type'
              value={formData.court_type}
              onChange={handleChange}
              className={fieldClass}
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
            />
          )}

          <div className='flex gap-3 pt-4'>
            <Button3D
              type='button'
              variant='secondary'
              onClick={() => navigate('/secretary/cases')}
            >
              Cancel
            </Button3D>

            <Button3D
              type='submit'
              variant='primary'
              disabled={isSubmitting || loading}
            >
              {isSubmitting || loading ? 'Creating...' : 'Create Case'}
            </Button3D>
          </div>
        </form>
      </Card>
    </div>
  );
}
