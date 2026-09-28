import { STAFF_PERMISSION_GROUPS } from '@/modules/admin/staff/staffPermissionOptions';

export default function StaffPermissionPicker({ role, selected, onChange, disabled = false }) {
  const groups = STAFF_PERMISSION_GROUPS[role] || [];

  const toggle = (code) => onChange(
    selected.includes(code) ? selected.filter((item) => item !== code) : [...selected, code],
  );
  const setGroup = (codes, on) => onChange(
    on ? [...new Set([...selected, ...codes])] : selected.filter((item) => !codes.includes(item)),
  );

  return (
    <div className='space-y-4'>
      {groups.map((group) => {
        const codes = group.permissions.map(([code]) => code);
        const allOn = codes.every((code) => selected.includes(code));
        return (
          <fieldset key={group.title} className='rounded-lg border border-border-light p-4 dark:border-border-dark'>
            <div className='mb-3 flex flex-wrap items-start justify-between gap-2'>
              <div>
                <legend className='font-semibold'>{group.title}</legend>
                {group.description && <p className='text-xs text-text-muted-light dark:text-text-muted-dark'>{group.description}</p>}
              </div>
              <button type='button' disabled={disabled} className='text-sm font-semibold text-brand-primary disabled:opacity-50' onClick={() => setGroup(codes, !allOn)}>
                {allOn ? 'Clear all' : 'Select all'}
              </button>
            </div>
            <div className='grid grid-cols-1 gap-2 md:grid-cols-2'>
              {group.permissions.map(([code, label]) => (
                <label key={code} className='flex items-center gap-2 text-sm'>
                  <input type='checkbox' disabled={disabled} checked={selected.includes(code)} onChange={() => toggle(code)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
