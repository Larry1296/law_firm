import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';

import Swal from '@/core/utils/themedSwal';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import { formatKes, formatLimit } from '@/modules/admin/subscription/utils/subscriptionFormatting';
import platformService from '@/modules/platform/services/platformService';
import {
  Button,
  ErrorNotice,
  Field,
  PageHeader,
  Panel,
  StatusBadge,
} from '@/modules/platform/components/ui';
import { inputClass } from '@/modules/platform/components/styles';

const LIMIT_FIELDS = [
  ['max_advocates', 'Advocates'],
  ['max_support_staff', 'Support staff'],
  ['max_active_matters', 'Active matters'],
  ['max_branches', 'Branches'],
];

const NEW_PLAN = {
  code: '', name: '', tagline: '', monthly_price: '', annual_price: '',
  max_advocates: '', max_support_staff: '', max_active_matters: '', max_branches: '',
  features: [], is_public: true, is_active: true, sort_order: 30,
};

const toDraft = (plan) => ({
  ...plan,
  ...Object.fromEntries(LIMIT_FIELDS.map(([key]) => [key, plan[key] ?? ''])),
});

const toPayload = (draft) => ({
  ...draft,
  ...Object.fromEntries(LIMIT_FIELDS.map(([key]) => [key, draft[key] === '' ? null : Number(draft[key])])),
  sort_order: Number(draft.sort_order) || 0,
});

function PlanForm({ initial, features, onDone, onCancel }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(initial);
  const isNew = !initial.id;
  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const toggleFeature = (code) => setDraft((current) => ({
    ...current,
    features: current.features.includes(code) ? current.features.filter((item) => item !== code) : [...current.features, code],
  }));
  const save = useMutation({
    mutationFn: () => (isNew ? platformService.createPlan(toPayload(draft)) : platformService.updatePlan(draft.id, toPayload(draft))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform'] });
      queryClient.invalidateQueries({ queryKey: ['subscription', 'plans'] });
      onDone();
    },
  });

  return (
    <form onSubmit={(event) => { event.preventDefault(); save.mutate(); }} className='grid gap-4 sm:grid-cols-2'>
      <Field label='Name' required><input required value={draft.name} onChange={set('name')} className={inputClass} /></Field>
      <Field label='Code' required hint={isNew ? 'Short identifier, e.g. BASIC. Cannot change later.' : 'Cannot change.'}>
        <input required value={draft.code} onChange={set('code')} disabled={!isNew} className={`${inputClass} uppercase`} />
      </Field>
      <Field label='Tagline' className='sm:col-span-2'><input value={draft.tagline} onChange={set('tagline')} className={inputClass} /></Field>
      <Field label='Monthly price (KES, excl. VAT)' required>
        <input required type='number' min='0' step='0.01' value={draft.monthly_price} onChange={set('monthly_price')} className={inputClass} />
      </Field>
      <Field label='Annual price (KES, excl. VAT)' required>
        <input required type='number' min='0' step='0.01' value={draft.annual_price} onChange={set('annual_price')} className={inputClass} />
      </Field>
      <fieldset className='grid grid-cols-2 gap-3 sm:col-span-2 md:grid-cols-4'>
        <legend className='mb-2 text-sm font-medium'>Limits <span className='font-normal text-text-muted-light dark:text-text-muted-dark'>(leave empty for unlimited)</span></legend>
        {LIMIT_FIELDS.map(([key, label]) => (
          <Field key={key} label={label}>
            <input type='number' min='0' value={draft[key]} onChange={set(key)} placeholder='Unlimited' className={inputClass} />
          </Field>
        ))}
      </fieldset>
      <fieldset className='sm:col-span-2'>
        <legend className='mb-2 text-sm font-medium'>Features</legend>
        <div className='space-y-2'>
          {features.map((feature) => (
            <label key={feature.code} className='flex items-start gap-2 text-sm'>
              <input type='checkbox' className='mt-1' checked={draft.features.includes(feature.code)} onChange={() => toggleFeature(feature.code)} />
              {feature.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className='flex flex-wrap gap-5 text-sm sm:col-span-2'>
        <label className='flex items-center gap-2'><input type='checkbox' checked={draft.is_active} onChange={set('is_active')} /> Available for new subscriptions</label>
        <label className='flex items-center gap-2'><input type='checkbox' checked={draft.is_public} onChange={set('is_public')} /> Shown on the homepage</label>
        <label className='flex items-center gap-2'>Display order <input type='number' value={draft.sort_order} onChange={set('sort_order')} className={`${inputClass} w-20`} /></label>
      </div>
      {save.error && <div className='sm:col-span-2'><ErrorNotice>{getApiErrorMessage(save.error)}</ErrorNotice></div>}
      <div className='flex gap-2 sm:col-span-2'>
        <Button type='submit' disabled={save.isPending}>{save.isPending ? 'Saving…' : isNew ? 'Create plan' : 'Save plan'}</Button>
        <Button variant='secondary' onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

export default function PlatformPlansPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['platform', 'plans'], queryFn: platformService.getPlans });
  const [editing, setEditing] = useState(null);
  const [actionError, setActionError] = useState(null);

  const remove = async (plan) => {
    const answer = await Swal.fire({
      icon: 'warning',
      title: `Delete the ${plan.name} plan?`,
      text: 'This cannot be undone.',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    });
    if (!answer.isConfirmed) return;
    try {
      setActionError(null);
      await platformService.deletePlan(plan.id);
      queryClient.invalidateQueries({ queryKey: ['platform'] });
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    }
  };

  if (isLoading) return <p role='status' className='text-sm text-text-muted-light'>Loading plans…</p>;
  if (error) return <ErrorNotice error={error} />;

  const features = data.features;
  const featureLabel = Object.fromEntries(features.map((item) => [item.code, item.label]));

  return (
    <>
      <PageHeader
        title='Plans'
        description='What firms can subscribe to. Changes to limits and features apply immediately to every firm on the plan. Prices exclude 16% VAT.'
        actions={!editing && <Button onClick={() => setEditing(NEW_PLAN)}><Plus size={14} /> New plan</Button>}
      />
      {actionError && <div className='mb-4'><ErrorNotice>{actionError}</ErrorNotice></div>}

      {editing && (
        <Panel title={editing.id ? `Edit ${editing.name}` : 'New plan'} className='mb-6'>
          <PlanForm key={editing.id || 'new'} initial={toDraft(editing)} features={features} onDone={() => setEditing(null)} onCancel={() => setEditing(null)} />
        </Panel>
      )}

      <div className='grid gap-6 lg:grid-cols-2'>
        {data.plans.map((plan) => (
          <Panel
            key={plan.id}
            title={<span className='flex items-center gap-2'>{plan.name} <span className='font-mono text-xs font-normal text-text-muted-light'>{plan.code}</span></span>}
            description={plan.tagline}
            actions={(
              <div className='flex gap-1'>
                <Button variant='ghost' size='sm' onClick={() => setEditing(plan)} aria-label={`Edit ${plan.name}`}><Pencil size={14} /></Button>
                {plan.subscriber_count === 0 && (
                  <Button variant='ghost' size='sm' onClick={() => remove(plan)} aria-label={`Delete ${plan.name}`}><Trash2 size={14} /></Button>
                )}
              </div>
            )}
            className={plan.is_active ? '' : 'opacity-70'}
          >
            <div className='flex flex-wrap items-baseline gap-x-4 gap-y-1'>
              <p className='text-2xl font-bold tabular-nums'>{formatKes(plan.monthly_price)}<span className='text-sm font-normal text-text-muted-light dark:text-text-muted-dark'> / month</span></p>
              <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>{formatKes(plan.annual_price)} / year</p>
            </div>
            <div className='mt-2 flex flex-wrap gap-2'>
              {plan.is_active ? <StatusBadge status='ACTIVE' label='Available' /> : <StatusBadge status='CANCELLED' label='Retired' />}
              {plan.is_public && plan.is_active && <StatusBadge status='TRIALING' label='On homepage' />}
              <span className='text-xs text-text-muted-light dark:text-text-muted-dark'>{plan.subscriber_count} firm{plan.subscriber_count === 1 ? '' : 's'}</span>
            </div>
            <dl className='mt-4 grid grid-cols-2 gap-2 text-sm'>
              {LIMIT_FIELDS.map(([key, label]) => (
                <div key={key} className='rounded-lg bg-background-light px-3 py-2 dark:bg-background-dark'>
                  <dt className='text-xs text-text-muted-light dark:text-text-muted-dark'>{label}</dt>
                  <dd className='font-semibold'>{formatLimit(plan[key])}</dd>
                </div>
              ))}
            </dl>
            <ul className='mt-4 space-y-1 text-sm'>
              {features.map((feature) => (
                <li key={feature.code} className={plan.features.includes(feature.code) ? '' : 'text-text-muted-light line-through dark:text-text-muted-dark'}>
                  <span aria-hidden='true'>{plan.features.includes(feature.code) ? '✓ ' : '✗ '}</span>
                  <span className='sr-only'>{plan.features.includes(feature.code) ? 'Included: ' : 'Not included: '}</span>
                  {featureLabel[feature.code]}
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </>
  );
}
