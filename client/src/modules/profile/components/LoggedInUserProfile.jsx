import {
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarDays,
  Mail,
  Phone,
  ShieldCheck,
  User,
} from 'lucide-react';

import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import { displayEnum, initials } from '@/core/utils/textFormatter';

const safe = (value) =>
  value === null || value === undefined || value === '' ? 'Not set' : value;

const firmName = (firm, profile) =>
  firm?.name ||
  profile?.firm_name ||
  profile?.law_firm_name ||
  profile?.firm?.name ||
  '';

const formatDate = (value) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const FieldGrid = ({ fields }) => (
  <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
    {fields
      .filter(Boolean)
      .map(([label, value]) => (
        <div
          key={label}
          className='rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3'
        >
          <p className='text-xs font-semibold uppercase tracking-widest text-[color:var(--text-muted)]'>
            {label}
          </p>
          <p className='mt-1 break-words text-sm font-medium text-[color:var(--text-primary)]'>
            {safe(value)}
          </p>
        </div>
      ))}
  </div>
);

const PermissionList = ({
  permissions = [],
  emptyText = 'No explicit permissions assigned.',
}) => (
  <div className='space-y-2'>
    {permissions.map((permission) => (
      <div
        key={permission}
        className='rounded-lg border border-[color:var(--border)] px-3 py-2 text-sm'
      >
        {displayEnum(permission)}
      </div>
    ))}

    {!permissions.length && (
      <p className='text-sm text-[color:var(--text-muted)]'>
        {emptyText}
      </p>
    )}
  </div>
);

export default function LoggedInUserProfile({
  title = 'My Profile',
  subtitle = 'Your logged-in account details and role information.',
  profile = {},
  account = {},
  firm = {},
  roleLabel,
  statusLabel,
  primaryFields = [],
  workFields = [],
  profileFields = [],
  permissions = [],
  workSectionTitle = 'Work Details',
  profileSectionTitle = 'Profile Details',
  permissionsTitle = 'Permissions',
  permissionsEmptyText = 'No explicit permissions assigned.',
  importantDatesTitle = 'Important Dates',
  dateFields,
  showPermissions = true,
  showImportantDates = true,
  isLoading = false,
  isError = false,
}) {
  const fullName =
    profile.full_name ||
    account.full_name ||
    [profile.first_name || account.first_name, profile.last_name || account.last_name]
      .filter(Boolean)
      .join(' ') ||
    account.email ||
    'User';
  const email = profile.email || account.email;
  const phone = profile.phone_number || account.phone_number;
  const role = roleLabel || displayEnum(profile.firm_role || account.firm_role || account.role);
  const status =
    statusLabel ||
    displayEnum(
      profile.employment_status ||
        profile.lifecycle_status ||
        account.lifecycle_status ||
        'ACTIVE',
    );

  return (
    <div className='space-y-6 p-4 md:p-6'>
      <SectionHeading
        title={title}
        subtitle={subtitle}
        align='left'
        size='compact'
      />

      {isLoading && <Card className='p-6'>Loading profile...</Card>}

      {isError && (
        <Card className='p-6'>
          <p className='text-sm text-red-600 dark:text-red-300'>
            Could not load your profile.
          </p>
        </Card>
      )}

      {!isLoading && !isError && (
        <>
          <Card className='overflow-hidden'>
            <div className='p-6'>
              <div className='flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between'>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-center'>
                  <div className='flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--brand-primary)] text-3xl font-bold text-white shadow-lg'>
                    {initials(fullName)}
                  </div>

                  <div>
                    <div className='flex flex-wrap items-center gap-2'>
                      <h2 className='text-2xl font-bold text-[color:var(--text-primary)]'>
                        {fullName}
                      </h2>
                      <span className='inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200'>
                        <BadgeCheck size={14} />
                        {status}
                      </span>
                    </div>
                    <p className='mt-2 text-sm text-[color:var(--text-muted)]'>
                      {role}
                    </p>
                    <div className='mt-4 flex flex-wrap gap-2'>
                      {email && (
                        <span className='inline-flex items-center gap-2 rounded-xl bg-[color:var(--background)] px-3 py-2 text-sm'>
                          <Mail size={15} />
                          {email}
                        </span>
                      )}
                      {phone && (
                        <span className='inline-flex items-center gap-2 rounded-xl bg-[color:var(--background)] px-3 py-2 text-sm'>
                          <Phone size={15} />
                          {phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:min-w-[320px]'>
                  <div className='rounded-xl border border-[color:var(--border)] px-4 py-3'>
                    <Building2 className='mb-2 text-[color:var(--brand-primary)]' size={18} />
                    <p className='text-xs text-[color:var(--text-muted)]'>Firm</p>
                    <p className='font-semibold'>{safe(firmName(firm, profile))}</p>
                  </div>
                  <div className='rounded-xl border border-[color:var(--border)] px-4 py-3'>
                    <Briefcase className='mb-2 text-[color:var(--brand-primary)]' size={18} />
                    <p className='text-xs text-[color:var(--text-muted)]'>Role</p>
                    <p className='font-semibold'>{role}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className='grid grid-cols-1 gap-6 xl:grid-cols-3'>
            <div className='space-y-6 xl:col-span-2'>
              <Card className='p-6'>
                <div className='mb-4 flex items-center gap-2'>
                  <User className='text-[color:var(--brand-primary)]' size={20} />
                  <h3 className='font-semibold'>Account Information</h3>
                </div>
                <FieldGrid fields={primaryFields} />
              </Card>

              {!!workFields.length && (
                <Card className='p-6'>
                  <div className='mb-4 flex items-center gap-2'>
                    <Briefcase className='text-[color:var(--brand-primary)]' size={20} />
                    <h3 className='font-semibold'>{workSectionTitle}</h3>
                  </div>
                  <FieldGrid fields={workFields} />
                </Card>
              )}

              {!!profileFields.length && (
                <Card className='p-6'>
                  <div className='mb-4 flex items-center gap-2'>
                    <Building2 className='text-[color:var(--brand-primary)]' size={20} />
                    <h3 className='font-semibold'>{profileSectionTitle}</h3>
                  </div>
                  <FieldGrid fields={profileFields} />
                </Card>
              )}
            </div>

            <div className='space-y-6'>
              {showPermissions && (
                <Card className='p-6'>
                  <div className='mb-4 flex items-center gap-2'>
                    <ShieldCheck className='text-[color:var(--brand-primary)]' size={20} />
                    <h3 className='font-semibold'>{permissionsTitle}</h3>
                  </div>
                  <PermissionList
                    permissions={permissions}
                    emptyText={permissionsEmptyText}
                  />
                </Card>
              )}

              {showImportantDates && (
                <Card className='p-6'>
                  <div className='mb-4 flex items-center gap-2'>
                    <CalendarDays className='text-[color:var(--brand-primary)]' size={20} />
                    <h3 className='font-semibold'>{importantDatesTitle}</h3>
                  </div>
                  <FieldGrid
                    fields={
                      dateFields || [
                        ['Date Hired', formatDate(profile.date_hired)],
                        ['Last Updated', formatDate(profile.updated_at || account.updated_at)],
                      ]
                    }
                  />
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
