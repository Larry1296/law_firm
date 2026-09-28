export default function AdvocateChecklist({ lawyers, selected, onChange, disabled = false }) {
  if (!lawyers.length) {
    return <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>No advocates yet. Create advocates first, then link them here.</p>;
  }

  const toggle = (id) => onChange(
    selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id],
  );

  return (
    <div className='grid grid-cols-1 gap-2 md:grid-cols-2'>
      {lawyers.map((lawyer) => (
        <label key={lawyer.id} className='flex items-center gap-2 text-sm'>
          <input type='checkbox' disabled={disabled} checked={selected.includes(String(lawyer.id))} onChange={() => toggle(String(lawyer.id))} />
          <span>{lawyer.full_name}{lawyer.is_active === false ? ' (inactive)' : ''}</span>
        </label>
      ))}
    </div>
  );
}
