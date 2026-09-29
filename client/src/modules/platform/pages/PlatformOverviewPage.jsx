import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Building2, CreditCard, Inbox, TrendingUp, Users } from 'lucide-react';

import ThemeContext from '@/core/store/ThemeContext';
import { formatKes, formatSubscriptionDate } from '@/modules/admin/subscription/utils/subscriptionFormatting';
import platformService from '@/modules/platform/services/platformService';
import {
  Button,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Panel,
  StatTile,
  StatusBadge,
} from '@/modules/platform/components/ui';
import { formatDateTime } from '@/modules/platform/components/styles';

// Validated against the light and dark chart surfaces (single series, no legend).
const BAR_COLOR = { light: '#1d6fa8', dark: '#3f8fd0' };

function NewFirmsChart({ data }) {
  const { theme } = useContext(ThemeContext);
  const dark = theme === 'dark';
  const ink = dark ? '#94A3B8' : '#5F6673';
  const grid = dark ? '#1F2A44' : '#E7E2D9';

  return (
    <figure>
      <div className='h-64' role='img' aria-label='New firms registered per month over the last twelve months'>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap={4}>
            <CartesianGrid vertical={false} stroke={grid} />
            <XAxis dataKey='label' tickFormatter={(label) => label.split(' ')[0]} tick={{ fill: ink, fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: ink, fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: dark ? 'rgba(255,255,255,0.05)' : 'rgba(18,56,90,0.06)' }}
              contentStyle={{
                background: dark ? '#111B2E' : '#FFFDF8',
                border: `1px solid ${grid}`,
                borderRadius: 8,
                color: dark ? '#E5E7EB' : '#1F2933',
                fontSize: 13,
              }}
              formatter={(value) => [value, 'New firms']}
            />
            <Bar dataKey='count' fill={dark ? BAR_COLOR.dark : BAR_COLOR.light} radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className='mt-3 text-sm'>
        <summary className='cursor-pointer text-text-muted-light dark:text-text-muted-dark'>Show as table</summary>
        <table className='mt-2 w-full text-left'>
          <thead><tr><th className='py-1'>Month</th><th className='py-1 text-right'>New firms</th></tr></thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.month}><td className='py-1'>{row.label}</td><td className='py-1 text-right tabular-nums'>{row.count}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function CountList({ rows }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0) || 1;
  return (
    <ul className='space-y-3'>
      {rows.map((row) => (
        <li key={row.key}>
          <div className='flex items-center justify-between gap-3 text-sm'>
            <span className='flex items-center gap-2'>{row.label}</span>
            <span className='font-semibold tabular-nums'>{row.count}</span>
          </div>
          <div className='mt-1 h-1.5 overflow-hidden rounded-full bg-background-light dark:bg-background-dark' aria-hidden='true'>
            <div className='h-full rounded-full bg-[#1d6fa8] dark:bg-[#3f8fd0]' style={{ width: `${(row.count / total) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function PlatformOverviewPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['platform', 'overview'], queryFn: platformService.getOverview });

  if (isLoading) return <p role='status' className='text-sm text-text-muted-light dark:text-text-muted-dark'>Loading the platform overview…</p>;
  if (error) return <ErrorNotice error={error} />;

  const { firms, subscriptions, owners } = data;
  const signedInShare = owners.total ? Math.round((owners.signed_in_last_30_days / owners.total) * 100) : 0;

  return (
    <>
      <PageHeader
        title='Platform overview'
        description='Every law firm on the platform, their subscriptions and their owners.'
        actions={<Link to='/platform/firms/register'><Button>Register a firm</Button></Link>}
      />

      {(data.pending_payments > 0 || data.new_onboarding_requests > 0) && (
        <div className='mb-6 grid gap-3 md:grid-cols-2'>
          {data.pending_payments > 0 && (
            <Link to='/platform/payments' className='flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100'>
              <CreditCard size={18} aria-hidden='true' />
              <span><strong>{data.pending_payments}</strong> M-Pesa payment{data.pending_payments === 1 ? '' : 's'} waiting for you to confirm against the Paybill statement.</span>
            </Link>
          )}
          {data.new_onboarding_requests > 0 && (
            <Link to='/platform/requests' className='flex items-center gap-3 rounded-xl border border-sky-300 bg-sky-50 p-4 text-sm text-sky-900 hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-100'>
              <Inbox size={18} aria-hidden='true' />
              <span><strong>{data.new_onboarding_requests}</strong> new firm{data.new_onboarding_requests === 1 ? '' : 's'} asking to be registered.</span>
            </Link>
          )}
        </div>
      )}

      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <StatTile label='Law firms' value={firms.total} hint={`${firms.new_this_month} new this month · ${firms.suspended} suspended`} icon={Building2} />
        <StatTile label='Monthly recurring revenue' value={formatKes(subscriptions.monthly_recurring_revenue)} hint='Active and grace-period subscriptions, excluding VAT' icon={TrendingUp} />
        <StatTile label='Firm owners' value={owners.total} hint={`${owners.active} active accounts`} icon={Users} />
        <StatTile label='Owners signed in, last 30 days' value={owners.signed_in_last_30_days} hint={`${signedInShare}% of firm owners`} icon={Users} />
      </div>

      <div className='mt-6 grid gap-6 xl:grid-cols-3'>
        <Panel title='New firms per month' description='Last twelve months' className='xl:col-span-2'>
          <NewFirmsChart data={data.new_firms_by_month} />
        </Panel>
        <div className='space-y-6'>
          <Panel title='Subscriptions by status'>
            <ul className='space-y-2'>
              {subscriptions.by_status.map((row) => (
                <li key={row.status} className='flex items-center justify-between text-sm'>
                  <StatusBadge status={row.status} />
                  <span className='font-semibold tabular-nums'>{row.count}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title='Firms by plan'>
            {subscriptions.by_plan.length
              ? <CountList rows={subscriptions.by_plan.map((row) => ({ key: row.plan, label: row.plan, count: row.count }))} />
              : <EmptyState>No firms yet.</EmptyState>}
          </Panel>
        </div>
      </div>

      <div className='mt-6 grid gap-6 xl:grid-cols-2'>
        <Panel title='Recently registered' bodyClassName='p-0'>
          {data.recent_firms.length ? (
            <ul className='divide-y divide-border-light dark:divide-border-dark'>
              {data.recent_firms.map((firm) => (
                <li key={firm.id}>
                  <Link to={`/platform/firms/${firm.id}`} className='block px-5 py-3 hover:bg-background-light dark:hover:bg-background-dark'>
                    <div className='flex items-center justify-between gap-3'>
                      <span className='truncate text-sm font-semibold'>{firm.name}</span>
                      <StatusBadge status={firm.subscription_status} />
                    </div>
                    <p className='mt-0.5 text-xs text-text-muted-light dark:text-text-muted-dark'>{firm.plan_name} · {formatSubscriptionDate(firm.created_at)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <EmptyState>No firms registered yet.</EmptyState>}
        </Panel>

        <Panel title='Trials ending within 7 days' bodyClassName='p-0'>
          {data.trials_ending_soon.length ? (
            <ul className='divide-y divide-border-light dark:divide-border-dark'>
              {data.trials_ending_soon.map((firm) => (
                <li key={firm.id}>
                  <Link to={`/platform/firms/${firm.id}`} className='block px-5 py-3 hover:bg-background-light dark:hover:bg-background-dark'>
                    <p className='truncate text-sm font-semibold'>{firm.name}</p>
                    <p className='mt-0.5 text-xs text-text-muted-light dark:text-text-muted-dark'>Trial ends {formatSubscriptionDate(firm.trial_ends_at)} · {firm.owner_email}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <EmptyState>No trials end this week.</EmptyState>}
        </Panel>
      </div>

      <Panel title='Recent platform activity' className='mt-6' bodyClassName='p-0'>
        {data.recent_activity.length ? (
          <ul className='divide-y divide-border-light dark:divide-border-dark'>
            {data.recent_activity.map((item) => (
              <li key={item.id} className='flex flex-col gap-1 px-5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between'>
                <span>{item.summary}</span>
                <span className='shrink-0 text-xs text-text-muted-light dark:text-text-muted-dark'>{item.actor ? `${item.actor} · ` : ''}{formatDateTime(item.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : <EmptyState>Nothing has happened yet.</EmptyState>}
      </Panel>
    </>
  );
}
