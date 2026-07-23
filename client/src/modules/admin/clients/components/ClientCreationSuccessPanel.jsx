import Button3D from '@/components/ui/Button3D';

export default function ClientCreationSuccessPanel({
  title,
  description,
  fields,
  tempPassword,
  noPortalMessage = 'Portal Access: Not created. This client is managed by firm staff.',
  viewLabel = 'View client',
  onView,
  onCreateMatter,
  onCreateAnother,
  onReturnToClients,
  onCopyPassword,
}) {
  return (
    <div className='rounded-xl border border-green-300/70 bg-green-50 p-6 text-green-950 dark:border-green-700 dark:bg-green-950/30 dark:text-green-100'>
      <h2 className='text-xl font-semibold'>{title}</h2>
      {description && <p className='mt-1 text-sm'>{description}</p>}

      <div className='mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm'>
        {fields.map(({ label, value }) => (
          <div key={label}>
            <strong>{label}:</strong> {value || 'Not recorded'}
          </div>
        ))}
      </div>

      {tempPassword && (
        <div className='mt-4 rounded-lg border border-green-300 bg-white/85 p-4 dark:border-green-700 dark:bg-[color:var(--surface-raised)]'>
          <div className='text-sm font-semibold'>Temporary password</div>
          <div className='mt-2 flex flex-col gap-3 sm:flex-row sm:items-center'>
            <code className='rounded bg-slate-100 px-3 py-2 text-slate-950 dark:bg-slate-900 dark:text-slate-100'>
              {tempPassword}
            </code>
            <Button3D type='button' variant='outlineLight' size='sm' onClick={onCopyPassword}>
              Copy password
            </Button3D>
          </div>
          <p className='mt-2 text-sm'>
            This password cannot be retrieved later. The client must change it after first login.
          </p>
        </div>
      )}

      {!tempPassword && (
        <div className='mt-4 rounded-lg border border-green-300 bg-white/85 p-4 text-sm dark:border-green-700 dark:bg-[color:var(--surface-raised)]'>
          {noPortalMessage}
        </div>
      )}

      <div className='mt-5 flex flex-wrap gap-3'>
        <Button3D type='button' variant='primary' onClick={onView}>
          {viewLabel}
        </Button3D>
        <Button3D type='button' variant='success' onClick={onCreateMatter}>
          Continue to create a matter
        </Button3D>
        <Button3D type='button' variant='outlineLight' onClick={onCreateAnother}>
          Create another client
        </Button3D>
        <Button3D type='button' variant='secondary' onClick={onReturnToClients}>
          Return to clients
        </Button3D>
      </div>
    </div>
  );
}
