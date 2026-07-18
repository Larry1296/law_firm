import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from '@/core/utils/themedSwal';

import Card from '@/components/ui/Card';
import Button3D from '@/components/ui/Button3D';
import FloatingInput from '@/components/ui/FloatingInput';

import { caseCreateInitialValues } from './create/caseCreateInitialValues';
import { buildCaseCreatePayload } from './create/caseCreatePayload';
import { validateCaseCreateForm } from './create/caseCreateValidation';
import {
  CASE_TYPES,
  COURT_DIVISIONS,
  COURT_TYPES,
  ENTRY_ROUTES,
  FORUMS,
  MATTER_NATURES,
  MONETARY_RELIEF_TYPES,
  PARTY_ROLES,
  PRACTICE_AREAS,
  PRIORITIES,
  PROCEDURE_TRACKS,
} from './create/caseCreateOptions';

const fieldClass = `
  w-full px-4 py-3 rounded-xl border
  bg-surface-light dark:bg-surface-dark
  text-text-primary-light dark:text-text-primary-dark
  border-border-light dark:border-border-dark
  focus:outline-none focus:ring-2 focus:ring-brand-primary
  transition
`;

const textAreaClass = `${fieldClass} min-h-28 resize-y`;

const normalizeId = (item) => item?.client_id || item?.membership_id || item?.id || '';

const responseCase = (result) => result?.data || result?.case || result || {};

const optionLabel = (options, value) =>
  options.find((item) => item.value === value)?.label || value || 'Not recorded';

const roleOptionsForProcedure = (procedureTrack) =>
  (PARTY_ROLES[procedureTrack] || PARTY_ROLES.DEFAULT).map((role) => ({
    value: role,
    label: role.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()),
  }));

const isCourtRoute = (formData) =>
  formData.forum === 'COURT' || formData.entry_route === 'EXISTING_FILED_COURT_CASE';

const isFiledCourtRoute = (formData) => formData.entry_route === 'EXISTING_FILED_COURT_CASE';

const isTribunalRoute = (formData) =>
  formData.forum === 'TRIBUNAL' || formData.entry_route === 'EXISTING_TRIBUNAL_MATTER';

const isArbitrationRoute = (formData) =>
  formData.forum === 'ARBITRATION' || formData.entry_route === 'EXISTING_ARBITRATION';

const Section = ({ title, children, description }) => (
  <div className='space-y-4 rounded-xl border border-border-light p-4 dark:border-border-dark'>
    <div>
      <h3 className='text-base font-semibold text-text-primary-light dark:text-text-primary-dark'>{title}</h3>
      {description && (
        <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>{description}</p>
      )}
    </div>
    {children}
  </div>
);

const SelectField = ({ label, name, value, onChange, options, error, required = false, children }) => (
  <div>
    <label className='block mb-2 text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
      {label}{required ? ' *' : ''}
    </label>
    <select name={name} value={value || ''} onChange={onChange} className={fieldClass} required={required}>
      {children || <option value=''>Select</option>}
      {options.map((item) => (
        <option key={item.value} value={item.value}>{item.label}</option>
      ))}
    </select>
    {error && <p className='mt-1 text-sm text-red-500'>{error}</p>}
  </div>
);

const ReadOnlyNotice = ({ title, children }) => (
  <div className='rounded-lg border border-dashed border-border-light bg-surface-light/70 p-4 text-sm text-text-secondary-light dark:border-border-dark dark:bg-surface-dark/70 dark:text-text-secondary-dark'>
    <p className='font-medium text-text-primary-light dark:text-text-primary-dark'>{title}</p>
    <p className='mt-1'>{children}</p>
  </div>
);

const ErrorSummary = ({ errors }) => {
  const entries = Object.entries(errors || {});
  if (!entries.length) return null;
  return (
    <div className='rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200'>
      <p className='font-semibold'>Resolve these items before submitting.</p>
      <ul className='mt-2 list-disc space-y-1 pl-5'>
        {entries.map(([field, message]) => <li key={field}>{message}</li>)}
      </ul>
    </div>
  );
};

const SuccessPanel = ({ result, listPath, detailsPath, onCreateAnother }) => {
  const createdCase = responseCase(result);
  const isFiled = createdCase.court_stage === 'FILED' || createdCase.court_stage_label === 'Filed';
  const navigate = useNavigate();
  return (
    <Card className='p-6'>
      <div className='space-y-5'>
        <div>
          <p className='text-sm font-medium uppercase tracking-wide text-text-muted-light dark:text-text-muted-dark'>
            {isFiled ? 'Filed court case registered successfully' : 'Matter opened successfully'}
          </p>
          <h2 className='mt-1 text-2xl font-semibold text-text-primary-light dark:text-text-primary-dark'>
            {createdCase.title || 'New matter'}
          </h2>
        </div>
        <dl className='grid gap-3 md:grid-cols-2'>
          <div>
            <dt className='text-sm text-text-muted-light dark:text-text-muted-dark'>Internal Matter Number</dt>
            <dd className='font-semibold'>{createdCase.case_number || createdCase.internal_matter_number || 'Generated'}</dd>
          </div>
          <div>
            <dt className='text-sm text-text-muted-light dark:text-text-muted-dark'>Official Court Case Number</dt>
            <dd className='font-semibold'>{createdCase.official_court_case_number || 'Not applicable'}</dd>
          </div>
          <div>
            <dt className='text-sm text-text-muted-light dark:text-text-muted-dark'>Client</dt>
            <dd className='font-semibold'>{createdCase.client_name || createdCase.client?.full_name || 'Recorded'}</dd>
          </div>
          <div>
            <dt className='text-sm text-text-muted-light dark:text-text-muted-dark'>Court Stage</dt>
            <dd className='font-semibold'>{createdCase.court_stage_label || createdCase.court_stage || 'Not applicable'}</dd>
          </div>
        </dl>
        <div className='flex flex-wrap gap-3 pt-2'>
          <Button3D type='button' variant='primary' onClick={() => navigate(detailsPath?.(createdCase.id) || listPath)}>
            View Matter
          </Button3D>
          <Button3D type='button' variant='secondary' onClick={onCreateAnother}>
            Create Another Matter
          </Button3D>
          <Button3D type='button' variant='outlineLight' onClick={() => navigate(listPath)}>
            Return to Matters
          </Button3D>
        </div>
      </div>
    </Card>
  );
};

export default function CaseCreateForm({
  clients = [],
  clientsLoading = false,
  lawyers = [],
  secretaries = [],
  createCase,
  cancelPath,
  detailsPath,
  listPath,
  canCreate = true,
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(caseCreateInitialValues);
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState(null);
  const [partyDraft, setPartyDraft] = useState({
    name: '',
    role: 'DEFENDANT',
    party_type: 'OTHER',
    is_adverse: true,
  });

  const steps = [
    'Entry Route',
    'Client and Matter',
    'Classification',
    'Parties',
    'Forum and Procedure',
    'Matter-Specific Details',
    'Monetary Relief',
    'Assignments and Dates',
    'Review',
  ];

  const sortedClients = useMemo(
    () => [...(clients || [])].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)),
    [clients],
  );
  const selectedClient = useMemo(
    () => sortedClients.find((client) => String(normalizeId(client)) === String(formData.client_id)),
    [sortedClients, formData.client_id],
  );

  const selectableLawyers = useMemo(
    () => (lawyers || []).filter((lawyer) => lawyer.system_role !== 'ADMIN'),
    [lawyers],
  );

  const filteredProcedures = useMemo(() => {
    const forum = formData.forum === 'COURT' ? 'COURT' : formData.forum;
    return PROCEDURE_TRACKS.filter((item) => !item.forums || item.forums.includes(forum));
  }, [formData.forum]);

  const currentRoleOptions = roleOptionsForProcedure(formData.procedure_track);

  const updateField = (name, value) => {
    setFormData((current) => {
      const next = { ...current, [name]: value };

      if (name === 'entry_route') {
        if (value === 'EXISTING_FILED_COURT_CASE') {
          next.forum = 'COURT';
        } else if (value === 'EXISTING_TRIBUNAL_MATTER') {
          next.forum = 'TRIBUNAL';
        } else if (value === 'EXISTING_ARBITRATION') {
          next.forum = 'ARBITRATION';
        } else if (value === 'NON_CONTENTIOUS_MATTER') {
          next.forum = 'NO_FORMAL_FORUM';
          next.matter_nature = 'NON_CONTENTIOUS';
          next.procedure_track = 'NON_CONTENTIOUS';
        } else if (value === 'NEW_INSTRUCTION') {
          next.official_court_case_number = '';
          next.filing_date = '';
          next.efiling_reference = '';
          next.payment_reference = '';
        }
      }

      if (name === 'forum') {
        const stillValid = PROCEDURE_TRACKS.some((item) => item.value === next.procedure_track && item.forums?.includes(value));
        if (!stillValid) next.procedure_track = '';
      }

      if (name === 'practice_area') {
        if (value === 'LAND_ENVIRONMENT') {
          next.case_type = 'LAND';
          next.court_type = 'ENVIRONMENT_LAND';
          next.court_division = 'ELC';
        } else if (value === 'EMPLOYMENT_LABOUR') {
          next.case_type = 'EMPLOYMENT';
          next.court_type = 'EMPLOYMENT_LABOUR';
          next.court_division = 'ELRC';
        } else if (value === 'SUCCESSION_PROBATE') {
          next.case_type = 'SUCCESSION';
          next.procedure_track = 'SUCCESSION_CAUSE';
        } else if (value === 'CRIMINAL_LITIGATION') {
          next.case_type = 'CRIMINAL';
          next.monetary_relief_type = 'NO_MONETARY_RELIEF';
          next.claim_amount = '';
        } else if (value === 'INSURANCE') {
          next.case_type = 'CIVIL';
        }
      }

      return next;
    });
    setErrors((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target;
    updateField(name, type === 'checkbox' ? checked : value);
  };

  const validationContext = { client_id: formData.client_id };

  const validateAndSet = () => {
    const result = validateCaseCreateForm(formData, validationContext);
    setErrors(result.errors);
    setWarnings(result.warnings);
    return result;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const validation = validateAndSet();
    if (!validation.isValid) return;

    try {
      setIsSubmitting(true);
      const payload = buildCaseCreatePayload(formData, {
        client_id: formData.client_id,
        plaintiff: selectedClient?.full_name || '',
      });
      const result = await createCase(payload);
      setCreatedResult(result);
      await Swal.fire({
        icon: 'success',
        title: isFiledCourtRoute(formData) ? 'Filed case registered' : 'Matter opened',
        text: isFiledCourtRoute(formData)
          ? 'The existing court case was registered for firm management.'
          : 'The matter was opened successfully.',
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (error) {
      const responseErrors = error?.response?.data?.errors || error?.response?.data || {};
      setErrors((current) => ({
        ...current,
        ...Object.fromEntries(
          Object.entries(responseErrors).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join(' ') : String(value),
          ]),
        ),
      }));
      Swal.fire({
        icon: 'error',
        title: 'Matter registration failed',
        text:
          error?.response?.data?.message ||
          'The backend rejected the matter registration. Review the highlighted fields.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canCreate) {
    return (
      <Card className='p-6'>
        <p className='font-semibold text-text-primary-light dark:text-text-primary-dark'>Access denied</p>
        <p className='mt-2 text-sm text-text-muted-light dark:text-text-muted-dark'>
          You do not have permission to create matters.
        </p>
      </Card>
    );
  }

  if (createdResult) {
    return (
      <SuccessPanel
        result={createdResult}
        listPath={listPath}
        detailsPath={detailsPath}
        onCreateAnother={() => {
          setCreatedResult(null);
          setFormData(caseCreateInitialValues);
          setStep(0);
          setErrors({});
          setWarnings([]);
        }}
      />
    );
  }

  const addParty = () => {
    const name = partyDraft.name.trim();
    if (!name) return;
    if (selectedClient && name.toLowerCase() === (selectedClient.full_name || selectedClient.company_name || '').toLowerCase()) {
      setErrors((current) => ({ ...current, parties: 'The represented client cannot be duplicated as an adverse party.' }));
      return;
    }
    setFormData((current) => ({
      ...current,
      parties: [...(current.parties || []), { ...partyDraft, name, organization_name: name }],
    }));
    setPartyDraft({ name: '', role: 'DEFENDANT', party_type: 'OTHER', is_adverse: true });
  };

  const removeParty = (index) => {
    setFormData((current) => ({
      ...current,
      parties: (current.parties || []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  return (
    <Card className='p-6'>
      <form onSubmit={handleSubmit} className='space-y-6'>
        <div className='flex flex-wrap gap-2'>
          {steps.map((label, index) => (
            <button
              key={label}
              type='button'
              onClick={() => setStep(index)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                step === index
                  ? 'border-brand-primary bg-brand-primary text-white'
                  : 'border-border-light text-text-secondary-light dark:border-border-dark dark:text-text-secondary-dark'
              }`}
            >
              {index + 1}. {label}
            </button>
          ))}
        </div>

        <ErrorSummary errors={errors} />
        {warnings.length > 0 && (
          <div className='rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-100'>
            {warnings.map((warning) => <p key={warning}>{warning}</p>)}
          </div>
        )}

        {step === 0 && (
          <Section
            title='How is this matter entering the firm?'
            description='The route controls whether court filing fields are required or hidden.'
          >
            <div className='grid gap-3 md:grid-cols-2'>
              {ENTRY_ROUTES.map((route) => (
                <button
                  key={route.value}
                  type='button'
                  onClick={() => updateField('entry_route', route.value)}
                  className={`rounded-xl border p-4 text-left transition ${
                    formData.entry_route === route.value
                      ? 'border-brand-primary bg-brand-primary/10'
                      : 'border-border-light dark:border-border-dark'
                  }`}
                >
                  <p className='font-semibold text-text-primary-light dark:text-text-primary-dark'>{route.label}</p>
                </button>
              ))}
            </div>
            {errors.entry_route && <p className='text-sm text-red-500'>{errors.entry_route}</p>}
          </Section>
        )}

        {step === 1 && (
          <Section title='Client and Matter'>
            <SelectField
              label='Client / Party Represented'
              name='client_id'
              value={formData.client_id}
              onChange={handleChange}
              options={sortedClients.map((client) => ({
                value: normalizeId(client),
                label: `${client.full_name || client.company_name || 'Unnamed client'}${client.client_type ? ` - ${client.client_type}` : ''}`,
              }))}
              error={errors.client_id}
              required
            >
              <option value=''>{clientsLoading ? 'Loading clients...' : 'Select client / party'}</option>
            </SelectField>
            {selectedClient && (
              <div className='grid gap-3 rounded-xl border border-border-light p-4 text-sm dark:border-border-dark md:grid-cols-2'>
                <p><strong>Client type:</strong> {selectedClient.client_type || 'Not recorded'}</p>
                <p><strong>Lifecycle:</strong> {selectedClient.lifecycle_status || 'Not recorded'}</p>
                <p><strong>Portal access:</strong> {selectedClient.portal_access_exists ? 'Exists' : selectedClient.access_type || 'Not recorded'}</p>
                <p><strong>Primary contact:</strong> {selectedClient.primary_contact_name || selectedClient.contact_full_name || 'Not recorded'}</p>
              </div>
            )}
            <FloatingInput label='Matter Title' name='title' value={formData.title} onChange={handleChange} error={errors.title} required />
            <div>
              <label className='block mb-2 text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                Matter Summary / Description
              </label>
              <textarea name='description' value={formData.description} onChange={handleChange} className={textAreaClass} />
              {errors.description && <p className='mt-1 text-sm text-red-500'>{errors.description}</p>}
            </div>
          </Section>
        )}

        {step === 2 && (
          <Section title='Classification'>
            <SelectField label='Practice Area' name='practice_area' value={formData.practice_area} onChange={handleChange} options={PRACTICE_AREAS} />
            <SelectField label='Matter Nature' name='matter_nature' value={formData.matter_nature} onChange={handleChange} options={MATTER_NATURES} />
            <SelectField label='Forum' name='forum' value={formData.forum} onChange={handleChange} options={FORUMS} />
            <SelectField label='Backend Matter Category' name='case_type' value={formData.case_type} onChange={handleChange} options={CASE_TYPES} error={errors.case_type} required />
          </Section>
        )}

        {step === 3 && (
          <Section title='Parties'>
            <SelectField label='Client Role' name='client_party_role' value={formData.client_party_role} onChange={handleChange} options={currentRoleOptions} error={errors.client_party_role} required />
            <FloatingInput
              label={formData.forum === 'NO_FORMAL_FORUM' ? 'Other Parties / Counterparties' : 'Adverse or Opposing Parties'}
              name='defendant'
              value={formData.defendant}
              onChange={handleChange}
              error={errors.defendant}
              required={formData.forum !== 'NO_FORMAL_FORUM'}
            />
            <div className='rounded-xl border border-border-light p-4 dark:border-border-dark'>
              <p className='mb-3 text-sm font-semibold text-text-primary-light dark:text-text-primary-dark'>Additional Parties</p>
              <div className='grid gap-3 md:grid-cols-[1fr_180px_180px_auto] md:items-end'>
                <FloatingInput label='Party Name' name='party_name' value={partyDraft.name} onChange={(event) => setPartyDraft((current) => ({ ...current, name: event.target.value }))} />
                <SelectField label='Role' name='party_role' value={partyDraft.role} onChange={(event) => setPartyDraft((current) => ({ ...current, role: event.target.value }))} options={currentRoleOptions} />
                <SelectField
                  label='Party Type'
                  name='party_type'
                  value={partyDraft.party_type}
                  onChange={(event) => setPartyDraft((current) => ({ ...current, party_type: event.target.value }))}
                  options={[
                    { value: 'INDIVIDUAL', label: 'Individual' },
                    { value: 'COMPANY', label: 'Company' },
                    { value: 'GOVERNMENT_ENTITY', label: 'Government Entity' },
                    { value: 'ESTATE', label: 'Estate' },
                    { value: 'TRUST', label: 'Trust' },
                    { value: 'ASSOCIATION', label: 'Association' },
                    { value: 'OTHER', label: 'Other' },
                  ]}
                />
                <Button3D type='button' variant='outlineLight' onClick={addParty}>Add Party</Button3D>
              </div>
              {errors.parties && <p className='mt-1 text-sm text-red-500'>{errors.parties}</p>}
              {(formData.parties || []).length > 0 && (
                <div className='mt-3 space-y-2'>
                  {formData.parties.map((party, index) => (
                    <div key={`${party.name}:${index}`} className='flex items-center justify-between rounded-lg border border-border-light px-3 py-2 text-sm dark:border-border-dark'>
                      <span>{party.name} - {party.role?.replaceAll('_', ' ')}</span>
                      <button type='button' className='text-red-600' onClick={() => removeParty(index)}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedClient && (
              <ReadOnlyNotice title='Represented Party'>
                {selectedClient.full_name || selectedClient.company_name} is automatically recorded as the represented party and should not be duplicated as an adverse party.
              </ReadOnlyNotice>
            )}
          </Section>
        )}

        {step === 4 && (
          <Section title='Forum and Procedure'>
            <SelectField label='Procedure Type' name='procedure_track' value={formData.procedure_track} onChange={handleChange} options={filteredProcedures} />
            <ReadOnlyNotice title='Internal Matter Number'>
              Generated automatically by Sheria Master. Do not enter the court-issued number here.
            </ReadOnlyNotice>
            {isCourtRoute(formData) && (
              <>
                {isFiledCourtRoute(formData) && (
                  <>
                    <FloatingInput label='Official Court Case Number' name='official_court_case_number' value={formData.official_court_case_number} onChange={handleChange} placeholder='ELC E012 of 2026' error={errors.official_court_case_number} required />
                    <FloatingInput label='Date Filed' name='filing_date' type='date' value={formData.filing_date} onChange={handleChange} noFloat error={errors.filing_date} required />
                    <FloatingInput label='eFiling Reference' name='efiling_reference' value={formData.efiling_reference} onChange={handleChange} error={errors.efiling_reference} required />
                    <FloatingInput label='Court Payment Reference' name='payment_reference' value={formData.payment_reference} onChange={handleChange} />
                  </>
                )}
                <SelectField label='Court Type' name='court_type' value={formData.court_type} onChange={handleChange} options={COURT_TYPES} error={errors.court_type} required />
                <FloatingInput label='Court Level' name='court_level' value={formData.court_level} onChange={handleChange} />
                <FloatingInput label='Court Name' name='court_name' value={formData.court_name} onChange={handleChange} />
                <FloatingInput label='Court Station' name='court_station' value={formData.court_station} onChange={handleChange} error={errors.court_station} />
                <SelectField label='Division / Registry' name='court_division' value={formData.court_division} onChange={handleChange} options={COURT_DIVISIONS} />
                <FloatingInput label='Registry' name='registry' value={formData.registry} onChange={handleChange} />
                <FloatingInput label='Courtroom' name='courtroom' value={formData.courtroom} onChange={handleChange} />
                <FloatingInput label='Judicial Officer' name='judicial_officer' value={formData.judicial_officer} onChange={handleChange} />
                <FloatingInput label='Court Location' name='court_location' value={formData.court_location} onChange={handleChange} />
                <ReadOnlyNotice title='CTS Reference'>
                  Assigned through court-record, jurisdiction-verification or lifecycle workflow. It is never submitted during initial matter creation.
                </ReadOnlyNotice>
              </>
            )}
            {isTribunalRoute(formData) && (
              <>
                <FloatingInput label='Tribunal Name' name='tribunal_name' value={formData.tribunal_name} onChange={handleChange} error={errors.tribunal_name} />
                <FloatingInput label='Tribunal Reference' name='tribunal_reference' value={formData.tribunal_reference} onChange={handleChange} />
                <FloatingInput label='Registry or Location' name='registry_or_location' value={formData.registry_or_location} onChange={handleChange} />
                <FloatingInput label='Panel or Adjudicator' name='panel_or_adjudicator' value={formData.panel_or_adjudicator} onChange={handleChange} />
              </>
            )}
            {isArbitrationRoute(formData) && (
              <>
                <FloatingInput label='Arbitration Institution' name='arbitration_institution' value={formData.arbitration_institution} onChange={handleChange} error={errors.arbitration_institution} />
                <FloatingInput label='Arbitration Reference' name='arbitration_reference' value={formData.arbitration_reference} onChange={handleChange} />
                <FloatingInput label='Arbitration Agreement' name='arbitration_agreement' value={formData.arbitration_agreement} onChange={handleChange} />
                <FloatingInput label='Seat' name='arbitration_seat' value={formData.arbitration_seat} onChange={handleChange} />
                <FloatingInput label='Rules' name='arbitration_rules' value={formData.arbitration_rules} onChange={handleChange} />
                <FloatingInput label='Arbitrator' name='arbitrator' value={formData.arbitrator} onChange={handleChange} />
                <FloatingInput label='Commencement Date' name='commencement_date' type='date' value={formData.commencement_date} onChange={handleChange} noFloat />
              </>
            )}
            {formData.forum === 'NO_FORMAL_FORUM' && (
              <>
                <FloatingInput label='Instruction Type' name='instruction_type' value={formData.instruction_type} onChange={handleChange} />
                <FloatingInput label='Deliverable' name='deliverable' value={formData.deliverable} onChange={handleChange} />
                <FloatingInput label='Target Completion Date' name='target_completion_date' type='date' value={formData.target_completion_date} onChange={handleChange} noFloat />
                <FloatingInput label='Counterparty' name='counterparty' value={formData.counterparty} onChange={handleChange} />
                <FloatingInput label='Transaction Value' name='transaction_value' type='number' value={formData.transaction_value} onChange={handleChange} />
                <FloatingInput label='Scope of Work' name='scope_of_work' value={formData.scope_of_work} onChange={handleChange} />
              </>
            )}
          </Section>
        )}

        {step === 5 && (
          <Section title='Matter-Specific Details'>
            {formData.practice_area === 'LAND_ENVIRONMENT' && (
              <>
                <FloatingInput label='Property Description' name='property_description' value={formData.property_description} onChange={handleChange} />
                <FloatingInput label='Title Number' name='title_number' value={formData.title_number} onChange={handleChange} />
                <FloatingInput label='Parcel Number' name='parcel_number' value={formData.parcel_number} onChange={handleChange} />
                <FloatingInput label='Land Reference Number' name='land_reference_number' value={formData.land_reference_number} onChange={handleChange} />
                <FloatingInput label='County' name='property_county' value={formData.property_county} onChange={handleChange} />
                <FloatingInput label='Location' name='location' value={formData.location} onChange={handleChange} />
                <FloatingInput label='Registered Owner' name='registered_owner' value={formData.registered_owner} onChange={handleChange} />
                <FloatingInput label='Estimated Property Value' name='property_value' type='number' value={formData.property_value} onChange={handleChange} />
                <FloatingInput label='Nature of Land Interest' name='nature_of_land_interest' value={formData.nature_of_land_interest} onChange={handleChange} />
                <FloatingInput label='Possession Status' name='possession_status' value={formData.possession_status} onChange={handleChange} />
                <label className='flex items-center gap-2 text-sm'><input type='checkbox' name='boundary_dispute' checked={formData.boundary_dispute} onChange={handleChange} /> Boundary dispute</label>
                <FloatingInput label='Environment Issue' name='environment_issue' value={formData.environment_issue} onChange={handleChange} />
                <FloatingInput label='Orders Sought' name='orders_sought' value={formData.orders_sought} onChange={handleChange} />
              </>
            )}
            {formData.practice_area === 'SUCCESSION_PROBATE' && (
              <>
                <FloatingInput label='Deceased Full Name' name='deceased_full_name' value={formData.deceased_full_name} onChange={handleChange} />
                <FloatingInput label='Date of Death' name='date_of_death' type='date' value={formData.date_of_death} onChange={handleChange} noFloat />
                <FloatingInput label='Estimated Estate Value' name='estate_value' value={formData.estate_value} onChange={handleChange} />
                <FloatingInput label='Place of Death' name='place_of_death' value={formData.place_of_death} onChange={handleChange} />
                <FloatingInput label='Testate Status' name='testate_status' value={formData.testate_status} onChange={handleChange} />
                <FloatingInput label='Will Date' name='will_date' type='date' value={formData.will_date} onChange={handleChange} noFloat />
                <FloatingInput label='Known Liabilities' name='known_liabilities' type='number' value={formData.known_liabilities} onChange={handleChange} />
                <FloatingInput label='Estimated Net Estate Value' name='estimated_net_estate_value' type='number' value={formData.estimated_net_estate_value} onChange={handleChange} />
                <FloatingInput label='Grant Type' name='grant_type' value={formData.grant_type} onChange={handleChange} />
                <FloatingInput label='Proposed Administrator' name='proposed_administrator' value={formData.proposed_administrator} onChange={handleChange} />
              </>
            )}
            {formData.practice_area === 'INSURANCE' && (
              <>
                <FloatingInput label='Insurer' name='insurer' value={formData.insurer} onChange={handleChange} />
                <FloatingInput label='Policy Number' name='policy_number' value={formData.policy_number} onChange={handleChange} />
                <FloatingInput label='Policy Type' name='policy_type' value={formData.policy_type} onChange={handleChange} />
                <FloatingInput label='Insured Party' name='insured_party' value={formData.insured_party} onChange={handleChange} />
                <FloatingInput label='Insurance Claim Number' name='insurance_claim_number' value={formData.insurance_claim_number} onChange={handleChange} />
                <FloatingInput label='Date of Loss' name='date_of_loss' type='date' value={formData.date_of_loss} onChange={handleChange} noFloat />
                <FloatingInput label='Cause of Loss' name='cause_of_loss' value={formData.cause_of_loss} onChange={handleChange} />
                <FloatingInput label='Policy Limit' name='policy_limit' type='number' value={formData.policy_limit} onChange={handleChange} />
                <FloatingInput label='Repudiation Date' name='repudiation_date' type='date' value={formData.repudiation_date} onChange={handleChange} noFloat />
                <FloatingInput label='Repudiation Reason' name='repudiation_reason' value={formData.repudiation_reason} onChange={handleChange} />
              </>
            )}
            {formData.practice_area === 'EMPLOYMENT_LABOUR' && (
              <>
                <FloatingInput label='Employer' name='employer' value={formData.employer} onChange={handleChange} />
                <FloatingInput label='Employee' name='employee' value={formData.employee} onChange={handleChange} />
                <FloatingInput label='Employment Start Date' name='employment_start_date' type='date' value={formData.employment_start_date} onChange={handleChange} noFloat />
                <FloatingInput label='Monthly Salary' name='monthly_salary' type='number' value={formData.monthly_salary} onChange={handleChange} />
                <FloatingInput label='Termination Date' name='termination_date' type='date' value={formData.termination_date} onChange={handleChange} noFloat />
                <FloatingInput label='Employment Status' name='employment_status' value={formData.employment_status} onChange={handleChange} />
                <FloatingInput label='Nature of Complaint' name='nature_of_complaint' value={formData.nature_of_complaint} onChange={handleChange} />
                <FloatingInput label='Dismissal Type' name='dismissal_type' value={formData.dismissal_type} onChange={handleChange} />
                <FloatingInput label='Labour Officer Reference' name='labour_officer_reference' value={formData.labour_officer_reference} onChange={handleChange} />
              </>
            )}
            {formData.practice_area === 'CRIMINAL_LITIGATION' && (
              <>
                <FloatingInput label='Accused Person' name='accused_person' value={formData.accused_person} onChange={handleChange} />
                <FloatingInput label='Charge' name='charge' value={formData.charge} onChange={handleChange} />
                <FloatingInput label='Statutory Provision' name='statutory_provision' value={formData.statutory_provision} onChange={handleChange} />
                <FloatingInput label='Plea' name='plea' value={formData.plea} onChange={handleChange} />
                <FloatingInput label='Arrest Date' name='arrest_date' type='date' value={formData.arrest_date} onChange={handleChange} noFloat />
                <FloatingInput label='Police Station' name='police_station' value={formData.police_station} onChange={handleChange} />
                <FloatingInput label='OB Number' name='ob_number' value={formData.ob_number} onChange={handleChange} />
                <FloatingInput label='Bond or Bail Status' name='bond_bail_status' value={formData.bond_bail_status} onChange={handleChange} />
                <FloatingInput label='Bond Amount' name='bond_amount' type='number' value={formData.bond_amount} onChange={handleChange} />
                <FloatingInput label='Custody Status' name='custody_status' value={formData.custody_status} onChange={handleChange} />
                <FloatingInput label='Prosecution Agency' name='prosecution_agency' value={formData.prosecution_agency} onChange={handleChange} />
              </>
            )}
          </Section>
        )}

        {step === 6 && (
          <Section title='Monetary Relief'>
            <SelectField label='Does this matter involve a monetary claim or value?' name='monetary_relief_type' value={formData.monetary_relief_type} onChange={handleChange} options={MONETARY_RELIEF_TYPES} />
            {formData.practice_area !== 'CRIMINAL_LITIGATION' && formData.monetary_relief_type !== 'NO_MONETARY_RELIEF' && (
              <>
                {formData.monetary_relief_type === 'QUANTIFIED' && (
                  <FloatingInput label='Principal / Claim Amount' name='claim_amount' type='number' value={formData.claim_amount} onChange={handleChange} error={errors.claim_amount} />
                )}
                <FloatingInput label='Currency' name='currency' value={formData.currency} onChange={handleChange} />
                <FloatingInput label='Interest Claimed' name='interest_claimed' value={formData.interest_claimed} onChange={handleChange} />
                <FloatingInput label='Outstanding Amount' name='outstanding_amount' value={formData.outstanding_amount} onChange={handleChange} />
                <FloatingInput label='Estimated Matter Value' name='estimated_matter_value' value={formData.estimated_matter_value} onChange={handleChange} />
              </>
            )}
            {formData.practice_area === 'CRIMINAL_LITIGATION' && (
              <ReadOnlyNotice title='Criminal Matter'>
                Ordinary claim amount is hidden. Restitution or compensation should be recorded through a dedicated backend workflow when available.
              </ReadOnlyNotice>
            )}
          </Section>
        )}

        {step === 7 && (
          <Section title='Assignments and Dates'>
            <SelectField
              label='Responsible Lawyer'
              name='assigned_lawyer_membership_id'
              value={formData.assigned_lawyer_membership_id}
              onChange={handleChange}
              options={selectableLawyers.map((lawyer) => ({ value: normalizeId(lawyer), label: lawyer.full_name }))}
            >
              <option value=''>Firm default lawyer</option>
            </SelectField>
            <SelectField
              label='Assigned Secretary'
              name='assigned_secretary_membership_id'
              value={formData.assigned_secretary_membership_id}
              onChange={handleChange}
              options={(secretaries || []).map((secretary) => ({ value: normalizeId(secretary), label: secretary.full_name }))}
            >
              <option value=''>Firm default secretary</option>
            </SelectField>
            <SelectField label='Priority' name='priority' value={formData.priority} onChange={handleChange} options={PRIORITIES} error={errors.priority} required />
            <FloatingInput label='Date Instructions Received' name='date_instructions_received' type='date' value={formData.date_instructions_received} onChange={handleChange} noFloat />
            <FloatingInput label='Limitation Date' name='limitation_date' type='date' value={formData.limitation_date} onChange={handleChange} noFloat />
            {isCourtRoute(formData) && (
              <>
                <FloatingInput label='Next Court Date' name='next_court_date' type='datetime-local' value={formData.next_court_date} onChange={handleChange} noFloat error={errors.next_court_date} />
                <FloatingInput label='Next Action' name='next_action' value={formData.next_action} onChange={handleChange} />
              </>
            )}
            <FloatingInput label='Jurisdiction Notes' name='jurisdiction_notes' value={formData.jurisdiction_notes} onChange={handleChange} />
            {isFiledCourtRoute(formData) && (
              <SelectField
                label='Conflict-check record at registration'
                name='conflict_record_status'
                value={formData.conflict_record_status}
                onChange={handleChange}
                options={[
                  { value: 'REQUIRES_VERIFICATION', label: 'Requires verification' },
                  { value: 'NOT_YET_RECORDED', label: 'Not yet recorded' },
                  { value: 'PREVIOUSLY_CLEARED', label: 'Previously cleared' },
                  { value: 'PREVIOUSLY_WAIVED', label: 'Previously waived' },
                ]}
              />
            )}
          </Section>
        )}

        {step === 8 && (
          <Section title='Review'>
            <dl className='grid gap-3 text-sm md:grid-cols-2'>
              <div><dt className='text-text-muted-light dark:text-text-muted-dark'>Entry Route</dt><dd className='font-semibold'>{optionLabel(ENTRY_ROUTES, formData.entry_route)}</dd></div>
              <div><dt className='text-text-muted-light dark:text-text-muted-dark'>Client</dt><dd className='font-semibold'>{selectedClient?.full_name || selectedClient?.company_name || 'Not selected'}</dd></div>
              <div><dt className='text-text-muted-light dark:text-text-muted-dark'>Practice Area</dt><dd className='font-semibold'>{optionLabel(PRACTICE_AREAS, formData.practice_area)}</dd></div>
              <div><dt className='text-text-muted-light dark:text-text-muted-dark'>Forum</dt><dd className='font-semibold'>{optionLabel(FORUMS, formData.forum)}</dd></div>
              <div><dt className='text-text-muted-light dark:text-text-muted-dark'>Internal Matter Number</dt><dd className='font-semibold'>Generated automatically</dd></div>
              <div><dt className='text-text-muted-light dark:text-text-muted-dark'>Official Court Case Number</dt><dd className='font-semibold'>{formData.official_court_case_number || 'Not applicable'}</dd></div>
              <div><dt className='text-text-muted-light dark:text-text-muted-dark'>Court Stage</dt><dd className='font-semibold'>{isFiledCourtRoute(formData) ? 'Filed' : 'Not yet filed / not applicable'}</dd></div>
              <div><dt className='text-text-muted-light dark:text-text-muted-dark'>CTS Reference</dt><dd className='font-semibold'>Pending controlled verification</dd></div>
            </dl>
          </Section>
        )}

        <div className='flex flex-wrap gap-3 pt-2'>
          <Button3D type='button' variant='secondary' onClick={() => (step === 0 ? navigate(cancelPath) : setStep((current) => current - 1))}>
            {step === 0 ? 'Cancel' : 'Back'}
          </Button3D>
          {step < steps.length - 1 ? (
            <Button3D type='button' variant='primary' onClick={() => setStep((current) => current + 1)}>
              Continue
            </Button3D>
          ) : (
            <Button3D type='submit' variant='primary' disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : isFiledCourtRoute(formData) ? 'Register Filed Case' : 'Open Matter'}
            </Button3D>
          )}
        </div>
      </form>
    </Card>
  );
}
