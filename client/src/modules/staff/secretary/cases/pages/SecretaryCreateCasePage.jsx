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
  { value: 'CONSTITUTIONAL_HUMAN_RIGHTS', label: 'Constitutional and Human Rights Division' },
  { value: 'FAMILY', label: 'Family Division' },
  { value: 'JUDICIAL_REVIEW', label: 'Judicial Review Division' },
  { value: 'ANTI_CORRUPTION_ECONOMIC_CRIMES', label: 'Anti-Corruption and Economic Crimes Division' },
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
    procedure_track: '',
    court_type: '',
    court_division: '',
    filing_date: '',
    court_name: '',
    court_station: '',
    registry: '',
    courtroom: '',
    judicial_officer: '',
    court_location: '',
    efiling_reference: '',
    cts_reference: '',
    payment_reference: '',
    next_court_date: '',
    next_action: '',
    client_party_role: 'PLAINTIFF',
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
        text: 'Please select the client or party represented by the firm.',
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
          {/* CLIENT / PARTY DROPDOWN */}
          <div>
            <label className='mb-2 block text-sm font-medium'>Client / Party Represented</label>

            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className={fieldClass}
              required
              disabled={clientsLoading}
            >
              <option value=''>
                {clientsLoading ? 'Loading clients...' : 'Select Client / Party'}
              </option>

              {sortedClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.full_name}
                  {client.national_id ? ` (${client.national_id})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className='mb-2 block text-sm font-medium'>Client Role in Matter</label>

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

          <div>
            <label className='mb-2 block text-sm font-medium'>Procedure Track</label>

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

          <div>
            <label className='mb-2 block text-sm font-medium'>Court Division / Registry</label>

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
            label='Court Station'
            name='court_station'
            value={formData.court_station}
            onChange={handleChange}
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

          <FloatingInput
            label='eFiling Reference'
            name='efiling_reference'
            value={formData.efiling_reference}
            onChange={handleChange}
          />

          <FloatingInput
            label='CTS Reference'
            name='cts_reference'
            value={formData.cts_reference}
            onChange={handleChange}
          />

          <FloatingInput
            label='Court Payment Reference'
            name='payment_reference'
            value={formData.payment_reference}
            onChange={handleChange}
          />

          <FloatingInput
            label='Next Court Date'
            name='next_court_date'
            type='datetime-local'
            value={formData.next_court_date}
            onChange={handleChange}
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
