import { reviewLabels, inputClass } from './preliminaryForm';
export default function PreliminaryFields({ values, setValues, fields = Object.keys(reviewLabels) }) {
  const update = (key, value) => setValues({ ...values, [key]: value });
  return <div className='grid min-w-0 gap-4 md:grid-cols-2'>{fields.map((key) => {
    if (['adverse_parties', 'related_parties'].includes(key)) return <fieldset key={key} className='min-w-0 space-y-2 rounded-lg border p-3'>
      <legend>{reviewLabels[key]}</legend>
      {(values[key] || []).map((party, index) => <div key={index} className='min-w-0 space-y-2'>
        <label className='block'>Name {index + 1}<input aria-label={`${reviewLabels[key]} name ${index + 1}`} className={inputClass} maxLength={255} required value={party.name} onChange={(e) => update(key, values[key].map((p, i) => i === index ? { ...p, name: e.target.value } : p))} /></label>
        <select aria-label={`${reviewLabels[key]} type ${index + 1}`} className={inputClass} value={party.party_type} onChange={(e) => update(key, values[key].map((p, i) => i === index ? { ...p, party_type: e.target.value } : p))}><option value='PERSON'>Person</option><option value='ORGANISATION'>Organisation</option></select>
        <button type='button' className='underline' onClick={() => update(key, values[key].filter((_, i) => i !== index))}>Remove {reviewLabels[key].toLowerCase()} name {index + 1}</button>
      </div>)}
      <button type='button' className='underline' disabled={(values[key] || []).length >= 50} onClick={() => update(key, [...(values[key] || []), { name: '', party_type: 'PERSON' }])}>Add {reviewLabels[key].toLowerCase()}</button>
    </fieldset>;
    const options = key === 'entity_kind' ? [['PERSON', 'Person'], ['ORGANISATION', 'Organisation']] : key === 'urgency' ? ['NONE', 'COURT_DATE', 'LIMITATION_CONCERN', 'ARREST_OR_CUSTODY', 'EVICTION', 'OTHER'].map(v => [v, v.replaceAll('_', ' ')]) : null;
    return <label key={key} className='block min-w-0'>{reviewLabels[key]}
      {options ? <select className={inputClass} value={values[key] || ''} onChange={(e) => update(key, e.target.value)}>{options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select>
        : key === 'preliminary_note' ? <textarea className={inputClass} maxLength={500} value={values[key] || ''} onChange={(e) => update(key, e.target.value)} />
          : <input className={inputClass} type={key === 'critical_date' ? 'date' : 'text'} maxLength={key === 'service_category' ? 100 : 255} required={['prospective_name', 'service_category'].includes(key)} value={values[key] || ''} onChange={(e) => update(key, key === 'critical_date' ? e.target.value || null : e.target.value)} />}
    </label>;
  })}</div>;
}
