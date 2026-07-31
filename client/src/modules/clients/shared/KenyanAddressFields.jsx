import { useState } from 'react';
import FloatingInput from '@/components/ui/FloatingInput';
import Select3D from '@/components/ui/Select3D';
import { KENYA_COUNTIES, KENYA_COUNTY_TOWNS, localitiesForTown } from './kenyaLocations';

const syntheticEvent = (name, value) => ({ target: { name, value, type: 'text' } });

export default function KenyanAddressFields({ formData, onChange, errors = {}, names = {} }) {
  const countryName = names.country || 'country';
  const countyName = names.county || 'county';
  const townName = names.town || 'city';
  const localityName = names.locality || 'street';
  const country = formData[countryName] || 'Kenya';
  const county = formData[countyName] || '';
  const town = formData[townName] || '';
  const locality = formData[localityName] || '';
  const isKenya = country.trim().toLowerCase() === 'kenya';
  const [editingOtherCountry, setEditingOtherCountry] = useState(Boolean(country && !isKenya));
  const towns = KENYA_COUNTY_TOWNS[county] || [];
  const [otherTown, setOtherTown] = useState(Boolean(town && !towns.includes(town)));
  const localityOptions = localitiesForTown(town);
  const [otherLocality, setOtherLocality] = useState(Boolean(locality && !localityOptions.includes(locality)));

  const chooseCountry = (event) => {
    const value = event.target.value;
    const outside = value === 'OTHER';
    setEditingOtherCountry(outside);
    onChange(syntheticEvent(countryName, outside ? '' : 'Kenya'));
    onChange(syntheticEvent(countyName, ''));
    onChange(syntheticEvent(townName, ''));
    onChange(syntheticEvent(localityName, ''));
  };
  const chooseCounty = (event) => {
    onChange(event);
    onChange(syntheticEvent(townName, ''));
    setOtherTown(false);
    setOtherLocality(false);
  };
  const chooseTown = (event) => {
    const isOther = event.target.value === 'OTHER';
    setOtherTown(isOther);
    onChange(syntheticEvent(townName, isOther ? '' : event.target.value));
    onChange(syntheticEvent(localityName, ''));
    setOtherLocality(false);
  };
  const chooseLocality = (event) => {
    const isOther = event.target.value === 'OTHER';
    setOtherLocality(isOther);
    onChange(syntheticEvent(localityName, isOther ? '' : event.target.value));
  };

  const showKenyanFields = !editingOtherCountry && isKenya;

  return <div className='col-span-full grid grid-cols-1 gap-4 rounded-xl border border-[color:var(--border)] p-4 md:grid-cols-2'>
    <div className='col-span-full'><p className='font-semibold'>Controlled physical location</p><p className='text-sm text-[color:var(--text-secondary)]'>Choose the country, county and nearest city or town, then select the nearest area, street or location.</p></div>
    <Select3D name={`${countryName}_selector`} label='Country' value={showKenyanFields ? 'Kenya' : 'OTHER'} onChange={chooseCountry} wrapperClassName='mb-0' options={[{ value: 'Kenya', label: 'Kenya' }, { value: 'OTHER', label: 'Another country' }]} />
    {!showKenyanFields ? <>
      <FloatingInput label='Country' name={countryName} value={country} onChange={onChange} error={errors[countryName]} required />
      <FloatingInput label='State / Region / County' name={countyName} value={county} onChange={onChange} error={errors[countyName]} />
      <FloatingInput label='Nearest City / Town' name={townName} value={town} onChange={onChange} error={errors[townName]} required />
      <FloatingInput label='Nearest Area / Street / Location' name={localityName} value={locality} onChange={onChange} error={errors[localityName]} />
    </> : <>
      <Select3D label='County' name={countyName} value={county} onChange={chooseCounty} error={errors[countyName]} wrapperClassName='mb-0' options={[{ value: '', label: 'Select one of Kenya’s 47 counties' }, ...KENYA_COUNTIES.map((item) => ({ value: item, label: item }))]} />
      <Select3D label='Nearest City / Town' name={townName} value={otherTown ? 'OTHER' : town} onChange={chooseTown} error={errors[townName]} disabled={!county} wrapperClassName='mb-0' options={[{ value: '', label: county ? 'Select nearest city or town' : 'Select county first' }, ...towns.map((item) => ({ value: item, label: item })), { value: 'OTHER', label: 'Other town / locality in this county' }]} />
      {otherTown && <FloatingInput label='Other Town / Locality' name={townName} value={town} onChange={onChange} error={errors[townName]} required />}
      {otherTown && town && <FloatingInput label='Nearest Area / Street / Location' name={localityName} value={locality} onChange={onChange} error={errors[localityName]} required />}
      {!otherTown && town && <Select3D label='Nearest Area / Street / Location' name={localityName} value={otherLocality ? 'OTHER' : locality} onChange={chooseLocality} error={errors[localityName]} wrapperClassName='mb-0' options={[{ value: '', label: 'Select nearest area, street or location' }, ...localityOptions.map((item) => ({ value: item, label: item })), { value: 'OTHER', label: 'Other area / street / location' }]} />}
      {otherLocality && <FloatingInput label='Exact Area / Street / Location' name={localityName} value={locality} onChange={onChange} error={errors[localityName]} required />}
    </>}
  </div>;
}
