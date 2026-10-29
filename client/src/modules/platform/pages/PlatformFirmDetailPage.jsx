import { withConfirmation } from '@/core/utils/confirmationContext';
import AutoGrowTextarea from '@/components/ui/AutoGrowTextarea';
import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import DeleteTrialFirmButton from '../components/DeleteTrialFirmButton';
import PlanChangePanel from '../components/PlanChangePanel';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, ImagePlus, KeyRound, Pause, Pencil, Play } from 'lucide-react';

import Swal from '@/core/utils/themedSwal';
import { apiAssetUrl } from '@/core/utils/apiAssetUrl';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import {
  formatKes,
  formatSubscriptionDate,
} from '@/modules/admin/subscription/utils/subscriptionFormatting';
import platformService from '@/modules/platform/services/platformService';
import {
  Button,
  EmptyState,
  ErrorNotice,
  Field,
  FirmAccessBadge,
  Panel,
  StatusBadge,
  Table,
} from '@/modules/platform/components/ui';
import { cellClass, formatDateTime, inputClass } from '@/modules/platform/components/styles';

const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');
const fromDateInput = (value) => (value ? new Date(`${value}T23:59:00`).toISOString() : null);

const PROFILE_FIELDS = [
  ['name', 'Registered name'],
  ['registration_number', 'BRS registration number'],
  ['kra_pin', 'KRA PIN'],
  ['email', 'Email'],
  ['phone_number', 'Phone'],
  ['website', 'Website'],
  ['physical_address', 'Physical address'],
  ['postal_address', 'Postal address'],
  ['town', 'Town'],
];

function Detail({ label, children }) {
  return (
    <div className='py-2'>
      <dt className='text-xs text-text-muted-light dark:text-text-muted-dark'>{label}</dt>
      <dd className='mt-0.5 break-words text-sm font-medium'>{children || '—'}</dd>
    </div>
  );
}

function ProfilePanel({ firm, meta, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const save = useMutation({
    mutationFn: () => platformService.updateFirm(firm.id, draft),
    onSuccess: (data) => {
      setEditing(false);
      onSaved(data);
    },
  });
  const startEditing = () => {
    setDraft(Object.fromEntries(
      [...PROFILE_FIELDS.map(([key]) => key), 'county', 'business_structure', 'description'].map((key) => [key, firm[key] || '']),
    ));
    setEditing(true);
  };
  const set = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));

  return (
    <Panel
      title='Firm details'
      actions={!editing && <Button variant='secondary' size='sm' onClick={startEditing}><Pencil size={13} /> Edit</Button>}
    >
      {editing ? (
        <form onSubmit={(event) => { event.preventDefault(); save.mutate(); }} className='grid gap-4 sm:grid-cols-2'>
          {PROFILE_FIELDS.map(([key, label]) => (
            <Field key={key} label={label}>
              <input value={draft[key]} onChange={set(key)} className={inputClass} />
            </Field>
          ))}
          <Field label='County'>
            <select value={draft.county} onChange={set('county')} className={inputClass}>
              <option value=''>—</option>
              {(meta?.counties || []).map((county) => <option key={county}>{county}</option>)}
            </select>
          </Field>
          <Field label='Business structure'>
            <select value={draft.business_structure} onChange={set('business_structure')} className={inputClass}>
              {(meta?.business_structures || []).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </Field>
          <Field label='About the firm' className='sm:col-span-2'>
            <AutoGrowTextarea value={draft.description} onChange={set('description')} className={inputClass} />
          </Field>
          {(save.error && !save.error?.isActionCancelled) && <div className='sm:col-span-2'><ErrorNotice error={save.error} /></div>}
          <div className='flex gap-2 sm:col-span-2'>
            <Button type='submit' disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save changes'}</Button>
            <Button variant='secondary' onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </form>
      ) : (
        <dl className='grid gap-x-6 sm:grid-cols-2'>
          <Detail label='Business structure'>{firm.business_structure_label}</Detail>
          <Detail label='BRS registration number'>{firm.registration_number}</Detail>
          <Detail label='KRA PIN'>{firm.kra_pin}</Detail>
          <Detail label='Email'>{firm.email}</Detail>
          <Detail label='Phone'>{firm.phone_number}</Detail>
          <Detail label='Website'>{firm.website}</Detail>
          <Detail label='Physical address'>{firm.physical_address}</Detail>
          <Detail label='Postal address'>{firm.postal_address}</Detail>
          <Detail label='Town, county'>{[firm.town, firm.county].filter(Boolean).join(', ')}</Detail>
          <Detail label='Head office'>{firm.head_office?.name}</Detail>
          {firm.settings && (
            <Detail label='Office hours'>
              {String(firm.settings.opening_time).slice(0, 5)}–{String(firm.settings.closing_time).slice(0, 5)}
              {firm.settings.work_on_saturday ? ', Saturdays too' : ''}
            </Detail>
          )}
          <Detail label='Practice areas'>{firm.practice_areas.join(', ')}</Detail>
          {firm.description && <div className='sm:col-span-2'><Detail label='About'>{firm.description}</Detail></div>}
        </dl>
      )}
    </Panel>
  );
}

function SubscriptionPanel({ firm, meta, onSaved }) {
  const subscription = firm.subscription;
  const initial = {
    plan_code: subscription.plan.code,
    billing_cycle: subscription.billing_cycle,
    status: subscription.status,
    trial_ends_at: toDateInput(subscription.trial_ends_at),
    current_period_end: toDateInput(subscription.current_period_end),
    notes: subscription.notes || '',
    is_complimentary: subscription.is_complimentary || false,
    custom_monthly_price: subscription.custom_monthly_price ?? '',
    custom_annual_price: subscription.custom_annual_price ?? '',
    pricing_reason: subscription.pricing_reason || '',
    grace_period_days: subscription.grace_period_days ?? 7,
  };
  const [draft, setDraft] = useState(initial);
  const set = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  const save = useMutation({
    mutationFn: () => platformService.updateSubscription(firm.id, {
      ...draft,
      custom_monthly_price: draft.custom_monthly_price === '' ? null : draft.custom_monthly_price,
      custom_annual_price: draft.custom_annual_price === '' ? null : draft.custom_annual_price,
      trial_ends_at: fromDateInput(draft.trial_ends_at),
      current_period_end: fromDateInput(draft.current_period_end),
    }),
    onSuccess: onSaved,
  });
  const changed = JSON.stringify(draft) !== JSON.stringify(initial);
  const pricingChanged = ['is_complimentary', 'custom_monthly_price', 'custom_annual_price'].some((key) => draft[key] !== initial[key]);
  const billingMode = draft.is_complimentary ? 'COMPLIMENTARY' : (draft.custom_monthly_price !== '' || draft.custom_annual_price !== '' ? 'CUSTOM' : 'STANDARD');
  const [selectedMode, setSelectedMode] = useState(billingMode);
  const changeBillingMode = (event) => {
    const mode = event.target.value;
    setSelectedMode(mode);
    setDraft((current) => ({
      ...current,
      is_complimentary: mode === 'COMPLIMENTARY',
      custom_monthly_price: '', custom_annual_price: '',
      ...(mode === 'COMPLIMENTARY' ? { status: 'ACTIVE', current_period_end: '', trial_ends_at: '' } : {}),
    }));
  };

  return (
    <Panel title='Subscription' description='Manage the plan, billing exceptions, trial and access period for this firm.'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='text-lg font-bold'>{subscription.plan.name}</span>
        <StatusBadge status={subscription.effective_status} />
      </div>
      <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>
        {subscription.effective_status === 'TRIALING' && `Trial ends ${formatSubscriptionDate(subscription.trial_ends_at)}.`}
        {['ACTIVE', 'GRACE'].includes(subscription.effective_status) && (subscription.current_period_end
          ? `Paid until ${formatSubscriptionDate(subscription.current_period_end)}.`
          : 'Does not lapse.')}
        {subscription.effective_status === 'EXPIRED' && 'Lapsed: the firm can view its records but cannot make changes.'}
        {' '}{subscription.is_complimentary ? 'Complimentary · ' : ''}{formatKes(subscription.billing_cycle === 'ANNUAL' ? (subscription.effective_annual_price ?? subscription.plan.annual_price) : (subscription.effective_monthly_price ?? subscription.plan.monthly_price))} / {subscription.billing_cycle === 'ANNUAL' ? 'year' : 'month'} excl. VAT
      </p>

      <form onSubmit={(event) => { event.preventDefault(); save.mutate(); }} className='mt-6 grid gap-4 border-t border-border-light pt-5 dark:border-border-dark sm:grid-cols-2'>
        <Field label='Plan'>
          <select value={draft.plan_code} onChange={set('plan_code')} className={inputClass}>
            {(meta?.plans || []).map((plan) => <option key={plan.code} value={plan.code}>{plan.name} — {formatKes(plan.monthly_price)}/month{plan.pricing_basis === 'ADVOCATE' ? ' per advocate' : ' per firm'}</option>)}
            {!(meta?.plans || []).some((plan) => plan.code === draft.plan_code) && <option value={draft.plan_code}>{subscription.plan.name} (retired)</option>}
          </select>
        </Field>
        <Field label='Billing cycle'>
          <select value={draft.billing_cycle} onChange={set('billing_cycle')} className={inputClass}>
            {(meta?.billing_cycles || []).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </Field>
        <Field label='Billing arrangement' className='sm:col-span-2' hint='Custom amounts are the total for this firm per period, regardless of advocate count. Blank amounts use the plan price. Existing paid invoices are preserved; unpaid invoices are voided when terms change.'>
          <select value={selectedMode} onChange={changeBillingMode} className={inputClass}>
            <option value='STANDARD'>Standard plan pricing</option>
            <option value='CUSTOM'>Custom firm price</option>
            <option value='COMPLIMENTARY'>Complimentary — exempt from subscription charges</option>
          </select>
        </Field>
        {selectedMode === 'CUSTOM' && <>
          <Field label='Custom monthly total (KES, excl. VAT)'>
            <input type='number' min='0' step='0.01' value={draft.custom_monthly_price} onChange={set('custom_monthly_price')} placeholder='Use plan price' className={inputClass} />
          </Field>
          <Field label='Custom annual total (KES, excl. VAT)'>
            <input type='number' min='0' step='0.01' value={draft.custom_annual_price} onChange={set('custom_annual_price')} placeholder='Use plan price' className={inputClass} />
          </Field>
        </>}
        <Field label='Reason for billing arrangement' required={pricingChanged} className='sm:col-span-2'>
          <AutoGrowTextarea required={pricingChanged} maxLength={500} value={draft.pricing_reason} onChange={set('pricing_reason')} className={inputClass} />
        </Field>
        <Field label='Status'>
          <select value={draft.status} onChange={set('status')} className={inputClass}>
            {(meta?.subscription_statuses || []).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </Field>
        {draft.status === 'TRIALING' ? (
          <Field label='Trial ends'>
            <input type='date' value={draft.trial_ends_at} onChange={set('trial_ends_at')} className={inputClass} />
          </Field>
        ) : (
          <Field label={draft.is_complimentary ? 'Complimentary until' : 'Paid until'} required={subscription.is_complimentary && !draft.is_complimentary && draft.status === 'ACTIVE'} hint={subscription.is_complimentary && !draft.is_complimentary ? 'Set an access end date when returning this firm to paid billing.' : 'Leave empty for access with no expiry.'}>
            <input type='date' required={subscription.is_complimentary && !draft.is_complimentary && draft.status === 'ACTIVE'} value={draft.current_period_end} onChange={set('current_period_end')} className={inputClass} />
          </Field>
        )}
        <Field label='Grace period (days)'>
          <input type='number' min='0' max='60' value={draft.grace_period_days} onChange={set('grace_period_days')} className={inputClass} />
        </Field>
        <Field label='Internal notes'  className='sm:col-span-2'>
          <AutoGrowTextarea value={draft.notes} onChange={set('notes')} className={inputClass} />
        </Field>
        {(save.error && !save.error?.isActionCancelled) && <div className='sm:col-span-2'><ErrorNotice error={save.error} /></div>}
        <div className='sm:col-span-2'>
          <Button type='submit' disabled={!changed || save.isPending}>{save.isPending ? 'Saving…' : 'Update subscription'}</Button>
        </div>
      </form>
    </Panel>
  );
}

export default function PlatformFirmDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const firmQuery = useQuery({ queryKey: ['platform', 'firm', id], queryFn: () => platformService.getFirm(id) });
  const meta = useQuery({ queryKey: ['platform', 'meta'], queryFn: platformService.getMeta });
  const [temporaryPassword, setTemporaryPassword] = useState(null);
  const [generatingPassword, setGeneratingPassword] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);
  const [actionError, setActionError] = useState(null);

  const refresh = (data) => {
    queryClient.setQueryData(['platform', 'firm', id], data);
    queryClient.invalidateQueries({ queryKey: ['platform', 'firm', id, 'plan-change'] });
    queryClient.invalidateQueries({ queryKey: ['platform', 'firms'] });
    queryClient.invalidateQueries({ queryKey: ['platform', 'overview'] });
  };

  const run = async (action) => {
    setActionError(null);
    try {
      return await action();
    } catch (error) { if (error?.isActionCancelled) return;
      setActionError(getApiErrorMessage(error));
      return null;
    }
  };

  if (firmQuery.isLoading) return <p role='status' className='text-sm text-text-muted-light'>Loading firm…</p>;
  if (firmQuery.error) return <ErrorNotice error={firmQuery.error} />;
  const firm = firmQuery.data;

  const toggleAccess = async () => {
    if (firm.is_active) {
      const answer = await Swal.fire({
        icon: 'warning',
        title: `Suspend ${firm.name}?`,
        text: 'Nobody at the firm, including its clients, will be able to sign in until you reactivate it. Their records are kept.',
        input: 'text',
        inputLabel: 'Reason (recorded in the activity log)',
        showCancelButton: true,
        confirmButtonText: 'Suspend firm',
      });
      if (!answer.isConfirmed) return;
      const data = await run(() => platformService.setFirmStatus(firm.id, withConfirmation(answer, { is_active: false, reason: answer.value || '' })));
      if (data) refresh(data);
    } else {
      const data = await run(() => platformService.setFirmStatus(firm.id, { is_active: true }));
      if (data) refresh(data);
    }
  };

  const generatePassword = async () => {
    const answer = await Swal.fire({
      icon: 'warning', titleText: 'Generate a temporary password?',
      text: `This replaces the password for ${firm.owner.email}. The owner must change it at sign-in.`,
      showCancelButton: true, confirmButtonText: 'Generate password',
    });
    if (!answer.isConfirmed) return;

    setGeneratingPassword(true);
    setTemporaryPassword(null);
    const data = await run(() => platformService.generateTemporaryPassword(firm.id, { confirmation: answer.confirmation }));
    setGeneratingPassword(false);
    if (data) {
      setTemporaryPassword(data.temp_password);
      queryClient.invalidateQueries({ queryKey: ['platform', 'firm', id] });
    }
  };

  const resendInvite = async () => {
    const data = await run(() => platformService.resendOwnerInvitation(firm.id));
    if (data) setInviteLink(data.owner_invitation_url);
  };

  const uploadLogo = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const data = await run(() => platformService.uploadLogo(firm.id, file));
    if (data) refresh(data);
  };

  return (
    <>
      <div className='mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <div className='flex min-w-0 items-center gap-4'>
          <label className='group relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark' title='Upload logo'>
            {firm.logo_url
              ? <img src={apiAssetUrl(firm.logo_url)} alt={`${firm.name} logo`} className='h-full w-full object-cover' />
              : <ImagePlus size={20} className='text-text-muted-light' aria-hidden='true' />}
            <span className='sr-only'>Upload logo</span>
            <input type='file' accept='image/png,image/jpeg,image/webp' className='sr-only' onChange={uploadLogo} />
          </label>
          <div className='min-w-0'>
            <h1 className='truncate text-2xl font-bold'>{firm.name}</h1>
            <div className='mt-1 flex flex-wrap items-center gap-2 text-sm text-text-muted-light dark:text-text-muted-dark'>
              <FirmAccessBadge isActive={firm.is_active} />
              <StatusBadge status={firm.subscription.effective_status} />
              <span>Registered {formatSubscriptionDate(firm.created_at)}</span>
            </div>
          </div>
        </div>
        <div className='flex flex-wrap gap-2'>
          <DeleteTrialFirmButton firm={firm} onDeleted={() => navigate('/platform/firms', { replace: true })} />
          <Button variant={firm.is_active ? 'danger' : 'primary'} onClick={toggleAccess}>
            {firm.is_active ? <><Pause size={14} /> Suspend firm</> : <><Play size={14} /> Reactivate firm</>}
          </Button>
        </div>
      </div>

      {actionError && <div className='mb-4'><ErrorNotice>{actionError}</ErrorNotice></div>}

      <div className='grid gap-6 xl:grid-cols-5'>
        <div className='space-y-6 xl:col-span-3'>
          <ProfilePanel firm={firm} meta={meta.data} onSaved={refresh} />

          <Panel title='Firm owner' description='The firm administrator and the only person at the firm the platform deals with. The firm’s staff, clients and matters stay private to the firm.'>
            <dl className='grid gap-x-6 sm:grid-cols-2'>
              <Detail label='Name'>{firm.owner.full_name}{firm.owner.job_title ? ` · ${firm.owner.job_title}` : ''}</Detail>
              <Detail label='Signs in with'>{firm.owner.email}</Detail>
              <Detail label='Phone'>{firm.owner.phone_number}</Detail>
              <Detail label='National ID'>{firm.owner.national_id_number}</Detail>
              <Detail label='Admission number'>{firm.owner.admission_number}</Detail>
              <Detail label='Last signed in'>{firm.owner.has_signed_in ? formatDateTime(firm.owner.last_login) : 'Has not signed in yet'}</Detail>
            </dl>
            <div className='mt-4 border-t border-border-light pt-4 dark:border-border-dark'>
              <Button variant='secondary' onClick={resendInvite}><KeyRound size={14} /> Send a new password link</Button>
              <Button variant='secondary' disabled={generatingPassword} onClick={generatePassword}>
                <KeyRound size={14} /> {generatingPassword ? 'Generating…' : 'Generate temporary password'}
              </Button>
              {temporaryPassword && (
                <div className='mt-3'>
                  <p className='text-xs text-text-muted-light dark:text-text-muted-dark'>Share this password with {firm.owner.email}. They must change it at sign-in. It is only shown here until you leave this page.</p>
                  <div className='mt-2 flex gap-2'>
                    <input readOnly value={temporaryPassword} aria-label='Temporary password' className={`${inputClass} font-mono text-xs`} onFocus={(event) => event.target.select()} />
                    <Button variant='secondary' onClick={() => navigator.clipboard?.writeText(temporaryPassword)} aria-label='Copy temporary password'><Copy size={14} /></Button>
                    <Button variant='secondary' onClick={() => setTemporaryPassword(null)}>Dismiss</Button>
                  </div>
                </div>
              )}
              {inviteLink && (
                <div className='mt-3'>
                  <p className='text-xs text-text-muted-light dark:text-text-muted-dark'>Emailed to {firm.owner.email}. You can also share it with them directly; it works once.</p>
                  <div className='mt-2 flex gap-2'>
                    <input readOnly value={inviteLink} aria-label='Password link' className={`${inputClass} font-mono text-xs`} onFocus={(event) => event.target.select()} />
                    <Button variant='secondary' onClick={() => navigator.clipboard?.writeText(inviteLink)} aria-label='Copy link'><Copy size={14} /></Button>
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </div>

        <div className='xl:col-span-2'>
          <SubscriptionPanel key={JSON.stringify(firm.subscription)} firm={firm} meta={meta.data} onSaved={refresh} />
        </div>
      </div>

      <div className='mt-6'>
        <PlanChangePanel firmId={firm.id} onChanged={() => queryClient.invalidateQueries({ queryKey: ['platform', 'firm', id], exact: true })} />
      </div>

      <div className='mt-6 grid gap-6 xl:grid-cols-2'>
        <Panel title='Subscription invoices' bodyClassName='p-0'>
          {firm.invoices.length ? (
            <Table caption='Subscription invoices' columns={['Invoice', 'Plan', 'Total', 'Status']}>
              {firm.invoices.map((invoice) => (
                <tr key={invoice.id} className='text-sm'>
                  <td className={cellClass}>{invoice.number}<p className='text-xs text-text-muted-light dark:text-text-muted-dark'>{formatSubscriptionDate(invoice.created_at)}</p></td>
                  <td className={cellClass}>{invoice.plan_name}</td>
                  <td className={`${cellClass} tabular-nums`}>{formatKes(invoice.total)}</td>
                  <td className={cellClass}>{invoice.status_label}{invoice.mpesa_receipt && <p className='font-mono text-xs'>{invoice.mpesa_receipt}</p>}</td>
                </tr>
              ))}
            </Table>
          ) : <EmptyState>No invoices yet.</EmptyState>}
        </Panel>

        <Panel title='Activity' bodyClassName='p-0'>
          {firm.activity.length ? (
            <ul className='divide-y divide-border-light dark:divide-border-dark'>
              {firm.activity.map((item) => (
                <li key={item.id} className='px-5 py-3 text-sm'>
                  {item.summary}
                  <p className='text-xs text-text-muted-light dark:text-text-muted-dark'>{item.actor ? `${item.actor} · ` : ''}{formatDateTime(item.created_at)}</p>
                </li>
              ))}
            </ul>
          ) : <EmptyState>No activity recorded.</EmptyState>}
        </Panel>
      </div>
    </>
  );
}
