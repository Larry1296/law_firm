import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Copy, ImagePlus, KeyRound, Pause, Pencil, Play } from 'lucide-react';

import Swal from '@/core/utils/themedSwal';
import { apiAssetUrl } from '@/core/utils/apiAssetUrl';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import {
  LIMIT_LABELS,
  formatKes,
  formatLimit,
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
            <textarea rows={3} value={draft.description} onChange={set('description')} className={inputClass} />
          </Field>
          {save.error && <div className='sm:col-span-2'><ErrorNotice error={save.error} /></div>}
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
  };
  const [draft, setDraft] = useState(initial);
  const set = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  const save = useMutation({
    mutationFn: () => platformService.updateSubscription(firm.id, {
      ...draft,
      trial_ends_at: fromDateInput(draft.trial_ends_at),
      current_period_end: fromDateInput(draft.current_period_end),
    }),
    onSuccess: onSaved,
  });
  const changed = JSON.stringify(draft) !== JSON.stringify(initial);

  return (
    <Panel title='Subscription' description='Change the plan, extend a trial or record a paid period.'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='text-lg font-bold'>{subscription.plan.name}</span>
        <StatusBadge status={subscription.effective_status} />
      </div>
      <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>
        {subscription.effective_status === 'TRIALING' && `Trial ends ${formatSubscriptionDate(subscription.trial_ends_at)}.`}
        {['ACTIVE', 'GRACE'].includes(subscription.effective_status) && (subscription.current_period_end
          ? `Paid until ${formatSubscriptionDate(subscription.current_period_end)}.`
          : 'Does not lapse (complimentary).')}
        {subscription.effective_status === 'EXPIRED' && 'Lapsed: the firm can view its records but cannot make changes.'}
        {' '}{formatKes(subscription.billing_cycle === 'ANNUAL' ? subscription.plan.annual_price : subscription.plan.monthly_price)} / {subscription.billing_cycle === 'ANNUAL' ? 'year' : 'month'} excl. VAT
      </p>

      <h3 className='mt-5 text-xs font-semibold uppercase tracking-wide text-text-muted-light dark:text-text-muted-dark'>Usage</h3>
      <ul className='mt-2 space-y-3'>
        {Object.entries(subscription.usage).map(([key, used]) => {
          const limit = subscription.plan.limits[key];
          const share = limit ? Math.min(used / limit, 1) : 0;
          return (
            <li key={key}>
              <div className='flex justify-between text-sm'>
                <span>{LIMIT_LABELS[key]}</span>
                <span className='tabular-nums'>{used} / {formatLimit(limit)}</span>
              </div>
              {limit !== null && limit !== undefined && (
                <div className='mt-1 h-1.5 overflow-hidden rounded-full bg-background-light dark:bg-background-dark' aria-hidden='true'>
                  <div className={`h-full rounded-full ${share >= 1 ? 'bg-warning' : 'bg-[#1d6fa8] dark:bg-[#3f8fd0]'}`} style={{ width: `${share * 100}%` }} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <form onSubmit={(event) => { event.preventDefault(); save.mutate(); }} className='mt-6 grid gap-4 border-t border-border-light pt-5 dark:border-border-dark sm:grid-cols-2'>
        <Field label='Plan'>
          <select value={draft.plan_code} onChange={set('plan_code')} className={inputClass}>
            {(meta?.plans || []).map((plan) => <option key={plan.code} value={plan.code}>{plan.name} — {formatKes(plan.monthly_price)}/month</option>)}
            {!(meta?.plans || []).some((plan) => plan.code === draft.plan_code) && <option value={draft.plan_code}>{subscription.plan.name} (retired)</option>}
          </select>
        </Field>
        <Field label='Billing cycle'>
          <select value={draft.billing_cycle} onChange={set('billing_cycle')} className={inputClass}>
            {(meta?.billing_cycles || []).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
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
          <Field label='Paid until' hint='Leave empty for a subscription that does not lapse.'>
            <input type='date' value={draft.current_period_end} onChange={set('current_period_end')} className={inputClass} />
          </Field>
        )}
        <Field label='Internal notes' className='sm:col-span-2'>
          <textarea rows={2} value={draft.notes} onChange={set('notes')} className={inputClass} />
        </Field>
        {save.error && <div className='sm:col-span-2'><ErrorNotice error={save.error} /></div>}
        <div className='sm:col-span-2'>
          <Button type='submit' disabled={!changed || save.isPending}>{save.isPending ? 'Saving…' : 'Update subscription'}</Button>
        </div>
      </form>
    </Panel>
  );
}

export default function PlatformFirmDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const firmQuery = useQuery({ queryKey: ['platform', 'firm', id], queryFn: () => platformService.getFirm(id) });
  const meta = useQuery({ queryKey: ['platform', 'meta'], queryFn: platformService.getMeta });
  const [inviteLink, setInviteLink] = useState(null);
  const [actionError, setActionError] = useState(null);

  const refresh = (data) => {
    queryClient.setQueryData(['platform', 'firm', id], data);
    queryClient.invalidateQueries({ queryKey: ['platform', 'firms'] });
    queryClient.invalidateQueries({ queryKey: ['platform', 'overview'] });
  };

  const run = async (action) => {
    setActionError(null);
    try {
      return await action();
    } catch (error) {
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
      const data = await run(() => platformService.setFirmStatus(firm.id, { is_active: false, reason: answer.value || '' }));
      if (data) refresh(data);
    } else {
      const data = await run(() => platformService.setFirmStatus(firm.id, { is_active: true }));
      if (data) refresh(data);
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
      <Link to='/platform/firms' className='mb-4 inline-flex items-center gap-1 text-sm text-text-muted-light hover:underline dark:text-text-muted-dark'>
        <ArrowLeft size={14} /> Law firms
      </Link>

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
          <Button variant={firm.is_active ? 'danger' : 'primary'} onClick={toggleAccess}>
            {firm.is_active ? <><Pause size={14} /> Suspend firm</> : <><Play size={14} /> Reactivate firm</>}
          </Button>
        </div>
      </div>

      {actionError && <div className='mb-4'><ErrorNotice>{actionError}</ErrorNotice></div>}

      <div className='mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {[
          ['Staff', firm.counts.members],
          ['Clients', firm.counts.clients],
          ['Matters', firm.counts.matters],
          ['Branches', firm.counts.branches],
        ].map(([label, value]) => (
          <div key={label} className='rounded-2xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark'>
            <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>{label}</p>
            <p className='mt-1 text-2xl font-bold tabular-nums'>{value}</p>
          </div>
        ))}
      </div>

      <div className='grid gap-6 xl:grid-cols-5'>
        <div className='space-y-6 xl:col-span-3'>
          <ProfilePanel firm={firm} meta={meta.data} onSaved={refresh} />

          <Panel title='Firm owner' description='The firm administrator. Only they can add staff and change firm settings.'>
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

      <Panel title='People' description='Staff accounts at the firm. Manage individual accounts from Users.' className='mt-6' bodyClassName='p-0'>
        {firm.members.length ? (
          <Table caption='Firm staff' columns={['Name', 'Role', 'Status', 'Last signed in']}>
            {firm.members.map((member) => (
              <tr key={member.user_id} className='text-sm'>
                <td className={cellClass}>{member.full_name}<p className='text-xs text-text-muted-light dark:text-text-muted-dark'>{member.email}</p></td>
                <td className={cellClass}>{member.role_label}</td>
                <td className={cellClass}>{member.is_active ? <StatusBadge status='ACTIVE' /> : <StatusBadge status='CANCELLED' label='Inactive' />}</td>
                <td className={`${cellClass} whitespace-nowrap`}>{member.last_login ? formatDateTime(member.last_login) : 'Never'}</td>
              </tr>
            ))}
          </Table>
        ) : <EmptyState>No staff yet.</EmptyState>}
      </Panel>

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
