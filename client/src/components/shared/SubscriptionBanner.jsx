import { Link } from 'react-router-dom';
import { AlertTriangle, Clock } from 'lucide-react';

import useSubscription from '@/modules/subscription/hooks/useSubscription';
import { formatSubscriptionDate } from '@/modules/admin/subscription/utils/subscriptionFormatting';

const TRIAL_WARNING_DAYS = 5;

function daysUntil(value) {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
}

function bannerFor(subscription) {
  if (!subscription) return null;
  const status = subscription.effective_status;

  if (status === 'EXPIRED' || status === 'SUSPENDED' || status === 'CANCELLED') {
    return {
      tone: 'danger',
      text: 'Your subscription has lapsed. Records remain available to view, but changes are paused until you renew.',
    };
  }
  if (status === 'GRACE') {
    return {
      tone: 'warning',
      text: `Your subscription period has ended. Renew by ${formatSubscriptionDate(subscription.grace_ends_at)} to avoid the firm becoming read-only.`,
    };
  }
  if (status === 'TRIALING') {
    const days = daysUntil(subscription.trial_ends_at);
    if (days !== null && days <= TRIAL_WARNING_DAYS) {
      return {
        tone: 'info',
        text: `Your free trial of the ${subscription.plan.name} plan ends in ${Math.max(days, 0)} day${days === 1 ? '' : 's'}.`,
      };
    }
  }
  return null;
}

const toneClasses = {
  danger: 'border-red-300 bg-red-50 text-red-900 dark:border-red-500/40 dark:bg-red-950/60 dark:text-red-100',
  warning: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-100',
  info: 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-500/40 dark:bg-blue-950/60 dark:text-blue-100',
};

export default function SubscriptionBanner({ manageLink = '/admin/subscription' }) {
  const { subscription } = useSubscription();
  const banner = bannerFor(subscription);
  if (!banner) return null;

  const Icon = banner.tone === 'info' ? Clock : AlertTriangle;

  return (
    <div
      role='status'
      className={`flex flex-wrap items-center gap-3 border-b px-4 py-3 text-sm sm:px-6 ${toneClasses[banner.tone]}`}
    >
      <Icon size={18} className='shrink-0' aria-hidden='true' />
      <p className='min-w-0 flex-1'>{banner.text}</p>
      {manageLink && (
        <Link to={manageLink} className='font-semibold underline underline-offset-2'>
          Manage subscription
        </Link>
      )}
    </div>
  );
}
