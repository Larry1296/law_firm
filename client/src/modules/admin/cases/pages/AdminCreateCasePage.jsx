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
import { buildCaseCreatePayload } from '@/modules/admin/cases/utils/caseCreatePayload';

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
  { value: 'JUDICIAL_REVIEW', label: 'Judicial Review' },
  { value: 'ELECTION_PETITION', label: 'Election Petition' },
  { value: 'TRIBUNAL', label: 'Tribunal' },
  { value: 'ARBITRATION', label: 'Arbitration' },
  { value: 'MEDIATION', label: 'Mediation' },
  { value: 'CONVEYANCING', label: 'Conveyancing' },
  { value: 'DEBT_RECOVERY', label: 'Debt Recovery' },
  { value: 'TRAFFIC', label: 'Traffic' },
  { value: 'CHILDREN', label: 'Children Matter' },
  { value: 'SMALL_CLAIM', label: 'Small Claim' },
];

const PROCEDURE_TRACKS = [
  { value: 'CIVIL_SUIT', label: 'Civil Suit' },
  { value: 'MISC_APPLICATION', label: 'Miscellaneous Application' },
  { value: 'PETITION', label: 'Petition' },
  { value: 'JUDICIAL_REVIEW', label: 'Judicial Review' },
  { value: 'APPEAL', label: 'Appeal' },
  { value: 'CRIMINAL_TRIAL', label: 'Criminal Trial' },
  { value: 'CRIMINAL_APPEAL', label: 'Criminal Appeal' },
  { value: 'SUCCESSION_CAUSE', label: 'Succession Cause' },
  { value: 'FAMILY_CAUSE', label: 'Family Cause' },
  { value: 'CHILDREN_MATTER', label: 'Children Matter' },
  { value: 'EMPLOYMENT_CLAIM', label: 'Employment Claim' },
  { value: 'ELC_SUIT', label: 'Environment and Land Suit' },
  { value: 'SMALL_CLAIM', label: 'Small Claim' },
  { value: 'TRIBUNAL_MATTER', label: 'Tribunal Matter' },
  { value: 'ADR', label: 'Alternative Dispute Resolution' },
  { value: 'NON_CONTENTIOUS', label: 'Non-Contentious Matter' },
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
  { value: 'COURT_MARTIAL', label: 'Court Martial' },
  { value: 'TRIBUNAL', label: 'Tribunal' },
  { value: 'ADR', label: 'Alternative Dispute Resolution' },
  { value: 'OTHER', label: 'Other' },
];

const COURT_DIVISIONS = [
  { value: 'CIVIL', label: 'Civil Division' },
  { value: 'CRIMINAL', label: 'Criminal Division' },
  { value: 'COMMERCIAL_TAX', label: 'Commercial and Tax Division' },
  {
    value: 'CONSTITUTIONAL_HUMAN_RIGHTS',
    label: 'Constitutional and Human Rights Division',
  },
  { value: 'FAMILY', label: 'Family Division' },
  { value: 'JUDICIAL_REVIEW', label: 'Judicial Review Division' },
  {
    value: 'ANTI_CORRUPTION_ECONOMIC_CRIMES',
    label: 'Anti-Corruption and Economic Crimes Division',
  },
  { value: 'ELC', label: 'Environment and Land Court' },
  { value: 'ELRC', label: 'Employment and Labour Relations Court' },
  { value: 'SMALL_CLAIMS', label: 'Small Claims Court' },
  { value: 'KADHI', label: 'Kadhi Court' },
  { value: 'TRIBUNAL', label: 'Tribunal' },
  { value: 'APPELLATE', label: 'Appellate' },
  { value: 'GENERAL', label: 'General Registry' },
  { value: 'OTHER', label: 'Other' },
];

const PARTY_ROLES = [
  { value: 'PLAINTIFF', label: 'Plaintiff' },
  { value: 'DEFENDANT', label: 'Defendant' },
  { value: 'PETITIONER', label: 'Petitioner' },
  { value: 'RESPONDENT', label: 'Respondent' },
  { value: 'APPLICANT', label: 'Applicant' },
  { value: 'APPELLANT', label: 'Appellant' },
  { value: 'ACCUSED', label: 'Accused' },
  { value: 'CLAIMANT', label: 'Claimant' },
  { value: 'OBJECTOR', label: 'Objector' },
  { value: 'BENEFICIARY', label: 'Beneficiary' },
  { value: 'ADMINISTRATOR', label: 'Administrator' },
  { value: 'OTHER', label: 'Other' },
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
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
    official_court_case_number: '',
    filing_date: '',
    efiling_reference: '',
    payment_reference: '',
    title: '',
    description: '',
    case_type: '',
    procedure_track: '',
    court_type: '',
    court_division: '',
    priority: 'MEDIUM',
    court_name: '',
    court_station: '',
    registry: '',
    courtroom: '',
    judicial_officer: '',
    court_location: '',
    next_court_date: '',
    next_action: '',
    client_party_role: 'PLAINTIFF',
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

  const selectableLawyers = useMemo(
    () => lawyers.filter((lawyer) => lawyer.system_role !== 'ADMIN'),
    [lawyers],
  );

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
        text: 'Please select the client or party represented by the firm.',
      });
    }

    try {
      setIsSubmitting(true);

      const payload = buildCaseCreatePayload(formData, {
        client_id: selectedClientId,
        plaintiff: selectedClient?.full_name || '',
        assigned_lawyer_membership_id: selectedLawyerId || null,
        assigned_secretary_membership_id: selectedSecretaryId || null,
      });

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
          {/* CLIENT / PARTY */}
          <div>
            <label className='block mb-2 text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
              Client / Party Represented
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
              <option value=''>Select Client / Party</option>

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

          {/* PRIORITY */}
          <div>
            <label className='block mb-2 text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
              Priority
            </label>

            <select
              name='priority'
              value={formData.priority}
              onChange={handleChange}
              className={fieldClass}
              style={{
                colorScheme: document.documentElement.classList.contains('dark')
                  ? 'dark'
                  : 'light',
              }}
              required
            >
              {PRIORITIES.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className='block mb-2 text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
              Client Role in Matter
            </label>

            <select
              name='client_party_role'
              value={formData.client_party_role}
              onChange={handleChange}
              className={fieldClass}
              required
            >
              {PARTY_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
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
              <option value=''>Firm owner lawyer</option>

              {selectableLawyers.map((l) => (
                <option key={l.membership_id} value={l.membership_id}>
                  {l.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className='block mb-2 text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
              Procedure Track
            </label>

            <select
              name='procedure_track'
              value={formData.procedure_track}
              onChange={handleChange}
              className={fieldClass}
            >
              <option value=''>Select Procedure Track</option>

              {PROCEDURE_TRACKS.map((track) => (
                <option key={track.value} value={track.value}>
                  {track.label}
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
              <option value=''>First registered secretary</option>

              {secretaries.map((s) => (
                <option key={s.membership_id} value={s.membership_id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className='block mb-2 text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
              Court Division / Registry
            </label>

            <select
              name='court_division'
              value={formData.court_division}
              onChange={handleChange}
              className={fieldClass}
            >
              <option value=''>Select Division / Registry</option>

              {COURT_DIVISIONS.map((division) => (
                <option key={division.value} value={division.value}>
                  {division.label}
                </option>
              ))}
            </select>
          </div>

          {/* CASE FIELDS */}

          <div className='rounded-lg border border-dashed border-border-light bg-surface-light/70 p-4 text-sm text-text-secondary-light dark:border-border-dark dark:bg-surface-dark/70 dark:text-text-secondary-dark'>
            <p className='font-medium text-text-primary-light dark:text-text-primary-dark'>
              Internal Matter Number
            </p>
            <p className='mt-1'>
              Generated automatically by Sheria Master when the filed court case
              is registered.
            </p>
          </div>

          <FloatingInput
            label='Official Court Case Number'
            name='official_court_case_number'
            value={formData.official_court_case_number}
            onChange={handleChange}
            placeholder='ELC E012 of 2026'
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
            label='eFiling Reference'
            name='efiling_reference'
            value={formData.efiling_reference}
            onChange={handleChange}
            required
          />

          <FloatingInput
            label='Court Payment Reference'
            name='payment_reference'
            value={formData.payment_reference}
            onChange={handleChange}
          />

          <FloatingInput
            label='Court Name'
            name='court_name'
            value={formData.court_name}
            onChange={handleChange}
            required
          />

          <FloatingInput
            label='Court Station'
            name='court_station'
            value={formData.court_station}
            onChange={handleChange}
            required
          />

          <FloatingInput
            label='Registry'
            name='registry'
            value={formData.registry}
            onChange={handleChange}
          />

          <FloatingInput
            label='Courtroom'
            name='courtroom'
            value={formData.courtroom}
            onChange={handleChange}
          />

          <FloatingInput
            label='Judge / Magistrate / Adjudicator'
            name='judicial_officer'
            value={formData.judicial_officer}
            onChange={handleChange}
          />

          <FloatingInput
            label='Court Location'
            name='court_location'
            value={formData.court_location}
            onChange={handleChange}
            required
          />

          <div className='rounded-lg border border-dashed border-border-light bg-surface-light/70 p-4 text-sm text-text-secondary-light dark:border-border-dark dark:bg-surface-dark/70 dark:text-text-secondary-dark'>
            <p className='font-medium text-text-primary-light dark:text-text-primary-dark'>
              CTS Reference
            </p>
            <p className='mt-1'>
              Assigned through the jurisdiction verification or court-record
              verification workflow. It is not submitted during case
              registration.
            </p>
          </div>

          <FloatingInput
            label='Next Court Date'
            name='next_court_date'
            type='datetime-local'
            value={formData.next_court_date}
            onChange={handleChange}
            noFloat
          />

          <FloatingInput
            label='Next Action'
            name='next_action'
            value={formData.next_action}
            onChange={handleChange}
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
              label='Selected Client / Party'
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
