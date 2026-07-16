import React, { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Swal from '@/core/utils/themedSwal';

import Card from '@/components/ui/Card';
import Button3D from '@/components/ui/Button3D';
import SectionHeading from '@/components/ui/SectionHeading';
import FloatingInput from '@/components/ui/FloatingInput';
import Select3D from '@/components/ui/Select3D';

import adminClientsService from '@/modules/admin/clients/services/adminClientsService';
import secretaryClientsService from '@/modules/staff/secretary/clients/services/secretaryClientServices';

export default function AdminCreateClientPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isSecretaryCreate = location.pathname.startsWith('/secretary/');

  const [searchParams] = useSearchParams();

  const requestedClientType = (
    searchParams.get('type') || 'INDIVIDUAL'
  ).toUpperCase();

  const clientTypeMap = {
    SACCO: 'COMPANY',
    COOPERATIVE: 'COMPANY',
    ASSOCIATION: 'NGO',
    RELIGIOUS: 'NGO',
    SCHOOL: 'GOVERNMENT',
  };

  const clientType = clientTypeMap[requestedClientType] || requestedClientType;
  const clientMode = searchParams.get('mode'); // prospect | assisted | null
  const isIndividualClientType = clientType === 'INDIVIDUAL';
  const [selectedClientMode, setSelectedClientMode] = useState(
    isIndividualClientType && clientMode === 'assisted' ? 'assisted' : 'prospect',
  );
  const partnershipAgreementTypes = [
    {
      value: 'GENERAL_PARTNERSHIP',
      label: 'General Partnership Agreement',
    },
    {
      value: 'LIMITED_PARTNERSHIP',
      label: 'Limited Partnership Agreement',
    },
    {
      value: 'LIMITED_LIABILITY_PARTNERSHIP',
      label: 'Limited Liability Partnership Agreement',
    },
    {
      value: 'JOINT_VENTURE',
      label: 'Joint Venture Agreement',
    },
    {
      value: 'SILENT_PARTNERSHIP',
      label: 'Silent Partnership Agreement',
    },
    {
      value: 'STRATEGIC_ALLIANCE',
      label: 'Strategic Alliance Agreement',
    },
    {
      value: 'PROFIT_SHARING',
      label: 'Profit Sharing Agreement',
    },
    {
      value: 'MEMORANDUM_OF_UNDERSTANDING',
      label: 'Memorandum of Understanding',
    },
  ];

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    phone_number: '',

    full_name: '',
    national_id: '',
    passport_number: '',
    gender: '',
    occupation: '',
    marital_status: '',

    company_name: '',
    registration_number: '',
    incorporation_date: '',
    country_of_incorporation: '',
    industry: '',
    company_status: 'ACTIVE',
    director_count: '',

    partnership_name: '',
    tax_pin: '',
    formation_date: '',
    partner_count: '',
    agreement_type: '',

    ngo_name: '',
    registration_authority: '',
    registration_date: '',
    sector: '',
    headquarters_address: '',
    operational_regions: '',
    director_name: '',
    director_contact: '',
    funding_sources: '',

    trust_name: '',
    trust_type: '',
    trust_deed_reference: '',
    jurisdiction: '',
    trustee_count: '',
    primary_trustee_name: '',
    primary_trustee_contact: '',
    beneficiary_details: '',
    assets_under_trust: '',
    legal_representative: '',

    estate_name: '',
    deceased_full_name: '',
    deceased_id_number: '',
    date_of_death: '',
    probate_number: '',
    court_reference: '',
    executor_name: '',
    executor_contact: '',
    administrator_name: '',
    administrator_contact: '',
    estate_value_estimate: '',
    beneficiaries: '',
    assets_description: '',
    liabilities_description: '',
    court_status: '',

    government_entity_name: '',
    department: '',
    agency_code: '',
    jurisdiction_level: '',
    contact_person_name: '',
    contact_person_position: '',
    contact_person_phone: '',
    contact_person_email: '',
    office_address: '',
    mandate_area: '',
    legal_department_head: '',
    legal_department_contact: '',

    contact_full_name: '',
    contact_email: '',
    contact_phone_number: '',
    contact_national_id_number: '',
    contact_role_or_designation: '',

    country: 'Kenya',
    county: '',
    city: '',
    street: '',
    postal_code: '',
    full_address: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const buildPayload = () => {
    const isProspect = clientType !== 'INDIVIDUAL' || selectedClientMode === 'prospect';
    const clean = (payload) =>
      Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== '' && value !== null),
      );

    const base = {
      email: isProspect
        ? formData.email ||
          formData.contact_email ||
          formData.contact_person_email
        : formData.email,
      phone_number: isProspect
        ? formData.phone_number ||
          formData.contact_phone_number ||
          formData.contact_person_phone ||
          formData.primary_trustee_contact ||
          formData.executor_contact ||
          formData.administrator_contact ||
          formData.director_contact
        : formData.phone_number,
      access_type: isProspect ? 'PROSPECT' : 'ASSISTED_CLIENT',
      country: formData.country,
      county: formData.county,
      city: formData.city,
      street: formData.street,
      postal_code: formData.postal_code,
      full_address: formData.full_address,
    };

    if (clientType === 'COMPANY') {
      return clean({
        ...base,
        company_name:
          formData.company_name ||
          `${requestedClientType.replace(/_/g, ' ')} Client`,
        registration_number: formData.registration_number,
        incorporation_date: formData.incorporation_date || null,
        country_of_incorporation: formData.country_of_incorporation,
        industry: formData.industry,
        company_status: formData.company_status,
        director_count: formData.director_count,
        contact_full_name: formData.contact_full_name,
        contact_email: formData.contact_email,
        contact_phone_number: formData.contact_phone_number,
        contact_national_id_number: formData.contact_national_id_number,
        contact_role_or_designation: formData.contact_role_or_designation,
      });
    }

    if (clientType === 'PARTNERSHIP') {
      return clean({
        ...base,
        partnership_name: formData.partnership_name,
        registration_number: formData.registration_number,
        tax_pin: formData.tax_pin,
        formation_date: formData.formation_date || null,
        partner_count: formData.partner_count,
        agreement_type: formData.agreement_type,
      });
    }

    if (clientType === 'NGO') {
      return clean({
        ...base,
        ngo_name: formData.ngo_name || formData.company_name,
        registration_number: formData.registration_number,
        tax_pin: formData.tax_pin,
        registration_authority: formData.registration_authority,
        registration_date: formData.registration_date || null,
        sector: formData.sector,
        headquarters_address: formData.headquarters_address,
        operational_regions: formData.operational_regions,
        director_name: formData.director_name,
        director_contact: formData.director_contact,
        funding_sources: formData.funding_sources,
      });
    }

    if (clientType === 'TRUST') {
      return clean({
        ...base,
        trust_name: formData.trust_name,
        trust_type: formData.trust_type,
        trust_deed_reference: formData.trust_deed_reference,
        formation_date: formData.formation_date || null,
        jurisdiction: formData.jurisdiction,
        trustee_count: formData.trustee_count,
        primary_trustee_name: formData.primary_trustee_name,
        primary_trustee_contact: formData.primary_trustee_contact,
        beneficiary_details: formData.beneficiary_details,
        assets_under_trust: formData.assets_under_trust,
        legal_representative: formData.legal_representative,
      });
    }

    if (clientType === 'ESTATE') {
      return clean({
        ...base,
        estate_name: formData.estate_name,
        deceased_full_name: formData.deceased_full_name,
        deceased_id_number: formData.deceased_id_number,
        date_of_death: formData.date_of_death || null,
        probate_number: formData.probate_number,
        court_reference: formData.court_reference,
        executor_name: formData.executor_name,
        executor_contact: formData.executor_contact,
        administrator_name: formData.administrator_name,
        administrator_contact: formData.administrator_contact,
        estate_value_estimate: formData.estate_value_estimate,
        beneficiaries: formData.beneficiaries,
        assets_description: formData.assets_description,
        liabilities_description: formData.liabilities_description,
        court_status: formData.court_status,
      });
    }

    if (clientType === 'GOVERNMENT') {
      return clean({
        ...base,
        government_entity_name:
          formData.government_entity_name || formData.company_name,
        department: formData.department,
        agency_code: formData.agency_code,
        registration_number: formData.registration_number,
        jurisdiction_level: formData.jurisdiction_level,
        contact_person_name: formData.contact_person_name,
        contact_person_position: formData.contact_person_position,
        contact_person_phone: formData.contact_person_phone,
        contact_person_email: formData.contact_person_email,
        office_address: formData.office_address,
        mandate_area: formData.mandate_area,
        legal_department_head: formData.legal_department_head,
        legal_department_contact: formData.legal_department_contact,
      });
    }

    return clean({
      ...base,
      full_name: formData.full_name,
      national_id: formData.national_id,
      passport_number: formData.passport_number,
      gender: formData.gender,
      occupation: formData.occupation,
      marital_status: formData.marital_status,
      contact_full_name: formData.contact_full_name,
      contact_email: formData.contact_email,
      contact_phone_number: formData.contact_phone_number,
      contact_national_id_number: formData.contact_national_id_number,
      contact_role_or_designation: formData.contact_role_or_designation,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      const payload = buildPayload();
      const response = isSecretaryCreate
        ? await secretaryClientsService.createClient(payload, clientType)
        : await adminClientsService.createClient(payload, clientType);

      const tempPassword = response?.temp_password;

      await Swal.fire({
        icon: 'success',
        title: 'Client Created Successfully',
        html: tempPassword
          ? `
              <p>The client login account has been created.</p>
              <div class="app-swal-password-card">
                <div class="app-swal-password-label">Temporary Password</div>
                <div class="app-swal-password-value">${tempPassword}</div>
              </div>
              <p class="app-swal-help-text">Share this with the client. They will be required to change it after their first login.</p>
            `
          : 'Client record created successfully.',
        confirmButtonText: 'Continue',
        confirmButtonColor: '#2563eb',
      });

      navigate(isSecretaryCreate ? '/secretary/clients' : '/admin/clients');
    } catch (error) {
      const data = error?.response?.data;

      let html = `<p>${data?.message ?? 'Unable to create client'}</p>`;

      if (data?.errors) {
        html += "<ul style='text-align:left;margin-top:10px'>";
        Object.entries(data.errors).forEach(([field, errors]) => {
          const message = Array.isArray(errors) ? errors.join(', ') : errors;
          html += `<li><b>${field}</b>: ${message}</li>`;
        });
        html += '</ul>';
      }

      Swal.fire({
        icon: 'error',
        title: 'Creation Failed',
        html,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isIndividual = clientType === 'INDIVIDUAL';
  const isCompany = clientType === 'COMPANY';
  const isPartnership = clientType === 'PARTNERSHIP';
  const isNGO = clientType === 'NGO';
  const isTrust = clientType === 'TRUST';
  const isEstate = clientType === 'ESTATE';
  const isGovernment = clientType === 'GOVERNMENT';
  const isProspect = !isIndividual || selectedClientMode === 'prospect';
  const isAssistedIndividual = isIndividual && !isProspect;

  return (
    <div className='space-y-6 p-4 md:p-6 animate-fadeIn'>
      <SectionHeading
        title='Create Client'
        subtitle={`${requestedClientType} / ${isProspect ? 'prospect' : 'assisted'}`}
      />

      <Card className='p-6'>
        <form onSubmit={handleSubmit} className='space-y-6'>
          {isIndividual && (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <Select3D
                label='Client Access'
                name='client_access'
                value={selectedClientMode}
                onChange={(event) => setSelectedClientMode(event.target.value)}
                options={[
                  { value: 'prospect', label: 'Prospect' },
                  { value: 'assisted', label: 'Assisted Client' },
                ]}
              />
            </div>
          )}

          {!isAssistedIndividual && (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FloatingInput
                label={isProspect ? 'Login Email' : 'Email'}
                name='email'
                value={formData.email}
                onChange={handleChange}
                required={isProspect}
              />

              <FloatingInput
                label={isProspect ? 'Login Phone Number' : 'Phone Number'}
                name='phone_number'
                value={formData.phone_number}
                onChange={handleChange}
                required={isProspect}
              />
            </div>
          )}

          {isCompany && (
            <>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FloatingInput
                label={requestedClientType === 'COMPANY' ? 'Company Name' : 'Entity Name'}
                name='company_name'
                value={formData.company_name}
                onChange={handleChange}
                  required
                />

                <FloatingInput
                  label='Registration Number'
                  name='registration_number'
                  value={formData.registration_number}
                  onChange={handleChange}
                  required
                />
              </div>

              <FloatingInput
                label='Incorporation Date'
                name='incorporation_date'
                type='date'
                value={formData.incorporation_date}
                onChange={handleChange}
              />

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <FloatingInput
                  label='Country of Incorporation'
                  name='country_of_incorporation'
                  value={formData.country_of_incorporation}
                  onChange={handleChange}
                />

                <FloatingInput
                  label='Industry / Sector'
                  name='industry'
                  value={formData.industry}
                  onChange={handleChange}
                />

                <FloatingInput
                  label='Director / Committee Count'
                  name='director_count'
                  type='number'
                  value={formData.director_count}
                  onChange={handleChange}
                />
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <FloatingInput
                  label='Contact Full Name'
                  name='contact_full_name'
                  value={formData.contact_full_name}
                  onChange={handleChange}
                  required
                />

                <FloatingInput
                  label='Contact Email'
                  name='contact_email'
                  value={formData.contact_email}
                  onChange={handleChange}
                  required
                />

                <FloatingInput
                  label='Contact Phone'
                  name='contact_phone_number'
                  value={formData.contact_phone_number}
                  onChange={handleChange}
                />

                <FloatingInput
                  label='Contact National ID'
                  name='contact_national_id_number'
                  value={formData.contact_national_id_number}
                  onChange={handleChange}
                  required
                />

                <FloatingInput
                  label='Contact Role'
                  name='contact_role_or_designation'
                  value={formData.contact_role_or_designation}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          {isPartnership && (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FloatingInput
                label='Partnership Name'
                name='partnership_name'
                value={formData.partnership_name}
                onChange={handleChange}
                required
              />

              <FloatingInput
                label='Registration Number'
                name='registration_number'
                value={formData.registration_number}
                onChange={handleChange}
              />

              <FloatingInput
                label='Tax PIN'
                name='tax_pin'
                value={formData.tax_pin}
                onChange={handleChange}
              />

              <FloatingInput
                label='Formation Date'
                name='formation_date'
                type='date'
                value={formData.formation_date}
                onChange={handleChange}
              />

              <FloatingInput
                label='Partner Count'
                name='partner_count'
                type='number'
                value={formData.partner_count}
                onChange={handleChange}
              />

              <Select3D
                label='Agreement Type'
                name='agreement_type'
                value={formData.agreement_type}
                onChange={handleChange}
                options={partnershipAgreementTypes}
              />
            </div>
          )}

          {isNGO && (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FloatingInput
                label='Organization Name'
                name='ngo_name'
                value={formData.ngo_name}
                onChange={handleChange}
                required
              />

              <FloatingInput
                label='Registration Number'
                name='registration_number'
                value={formData.registration_number}
                onChange={handleChange}
                required
              />

              <FloatingInput
                label='Tax PIN'
                name='tax_pin'
                value={formData.tax_pin}
                onChange={handleChange}
              />

              <FloatingInput
                label='Registration Authority'
                name='registration_authority'
                value={formData.registration_authority}
                onChange={handleChange}
              />

              <FloatingInput
                label='Registration Date'
                name='registration_date'
                type='date'
                value={formData.registration_date}
                onChange={handleChange}
              />

              <FloatingInput
                label='Sector'
                name='sector'
                value={formData.sector}
                onChange={handleChange}
              />

              <FloatingInput
                label='Director Name'
                name='director_name'
                value={formData.director_name}
                onChange={handleChange}
              />

              <FloatingInput
                label='Director Contact'
                name='director_contact'
                value={formData.director_contact}
                onChange={handleChange}
              />

              <FloatingInput
                label='Headquarters Address'
                name='headquarters_address'
                value={formData.headquarters_address}
                onChange={handleChange}
              />

              <FloatingInput
                label='Operational Regions'
                name='operational_regions'
                value={formData.operational_regions}
                onChange={handleChange}
              />

              <FloatingInput
                label='Funding Sources'
                name='funding_sources'
                value={formData.funding_sources}
                onChange={handleChange}
              />
            </div>
          )}

          {isTrust && (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FloatingInput
                label='Trust Name'
                name='trust_name'
                value={formData.trust_name}
                onChange={handleChange}
                required
              />

              <FloatingInput
                label='Trust Type'
                name='trust_type'
                value={formData.trust_type}
                onChange={handleChange}
              />

              <FloatingInput
                label='Trust Deed Reference'
                name='trust_deed_reference'
                value={formData.trust_deed_reference}
                onChange={handleChange}
              />

              <FloatingInput
                label='Formation Date'
                name='formation_date'
                type='date'
                value={formData.formation_date}
                onChange={handleChange}
              />

              <FloatingInput
                label='Jurisdiction'
                name='jurisdiction'
                value={formData.jurisdiction}
                onChange={handleChange}
              />

              <FloatingInput
                label='Trustee Count'
                name='trustee_count'
                type='number'
                value={formData.trustee_count}
                onChange={handleChange}
              />

              <FloatingInput
                label='Primary Trustee Name'
                name='primary_trustee_name'
                value={formData.primary_trustee_name}
                onChange={handleChange}
              />

              <FloatingInput
                label='Primary Trustee Contact'
                name='primary_trustee_contact'
                value={formData.primary_trustee_contact}
                onChange={handleChange}
              />

              <FloatingInput
                label='Beneficiary Details'
                name='beneficiary_details'
                value={formData.beneficiary_details}
                onChange={handleChange}
              />

              <FloatingInput
                label='Assets Under Trust'
                name='assets_under_trust'
                value={formData.assets_under_trust}
                onChange={handleChange}
              />

              <FloatingInput
                label='Legal Representative'
                name='legal_representative'
                value={formData.legal_representative}
                onChange={handleChange}
              />
            </div>
          )}

          {isEstate && (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FloatingInput
                label='Estate Name'
                name='estate_name'
                value={formData.estate_name}
                onChange={handleChange}
                required
              />

              <FloatingInput
                label='Deceased Full Name'
                name='deceased_full_name'
                value={formData.deceased_full_name}
                onChange={handleChange}
                required
              />

              <FloatingInput
                label='Deceased ID Number'
                name='deceased_id_number'
                value={formData.deceased_id_number}
                onChange={handleChange}
              />

              <FloatingInput
                label='Date of Death'
                name='date_of_death'
                type='date'
                value={formData.date_of_death}
                onChange={handleChange}
              />

              <FloatingInput
                label='Probate Number'
                name='probate_number'
                value={formData.probate_number}
                onChange={handleChange}
              />

              <FloatingInput
                label='Court Reference'
                name='court_reference'
                value={formData.court_reference}
                onChange={handleChange}
              />

              <FloatingInput
                label='Executor Name'
                name='executor_name'
                value={formData.executor_name}
                onChange={handleChange}
              />

              <FloatingInput
                label='Executor Contact'
                name='executor_contact'
                value={formData.executor_contact}
                onChange={handleChange}
              />

              <FloatingInput
                label='Administrator Name'
                name='administrator_name'
                value={formData.administrator_name}
                onChange={handleChange}
              />

              <FloatingInput
                label='Administrator Contact'
                name='administrator_contact'
                value={formData.administrator_contact}
                onChange={handleChange}
              />

              <FloatingInput
                label='Estate Value Estimate'
                name='estate_value_estimate'
                type='number'
                value={formData.estate_value_estimate}
                onChange={handleChange}
              />

              <FloatingInput
                label='Beneficiaries'
                name='beneficiaries'
                value={formData.beneficiaries}
                onChange={handleChange}
              />

              <FloatingInput
                label='Assets Description'
                name='assets_description'
                value={formData.assets_description}
                onChange={handleChange}
              />

              <FloatingInput
                label='Liabilities Description'
                name='liabilities_description'
                value={formData.liabilities_description}
                onChange={handleChange}
              />

              <FloatingInput
                label='Court Status'
                name='court_status'
                value={formData.court_status}
                onChange={handleChange}
              />
            </div>
          )}

          {isGovernment && (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FloatingInput
                label={requestedClientType === 'SCHOOL' ? 'School Name' : 'Government Entity Name'}
                name='government_entity_name'
                value={formData.government_entity_name}
                onChange={handleChange}
                required
              />

              <FloatingInput
                label='Department'
                name='department'
                value={formData.department}
                onChange={handleChange}
              />

              <FloatingInput
                label='Agency / Institution Code'
                name='agency_code'
                value={formData.agency_code}
                onChange={handleChange}
              />

              <FloatingInput
                label='Registration Number'
                name='registration_number'
                value={formData.registration_number}
                onChange={handleChange}
              />

              <FloatingInput
                label='Jurisdiction Level'
                name='jurisdiction_level'
                value={formData.jurisdiction_level}
                onChange={handleChange}
              />

              <FloatingInput
                label='Contact Person Name'
                name='contact_person_name'
                value={formData.contact_person_name}
                onChange={handleChange}
              />

              <FloatingInput
                label='Contact Person Position'
                name='contact_person_position'
                value={formData.contact_person_position}
                onChange={handleChange}
              />

              <FloatingInput
                label='Contact Person Phone'
                name='contact_person_phone'
                value={formData.contact_person_phone}
                onChange={handleChange}
              />

              <FloatingInput
                label='Contact Person Email'
                name='contact_person_email'
                value={formData.contact_person_email}
                onChange={handleChange}
              />

              <FloatingInput
                label='Office Address'
                name='office_address'
                value={formData.office_address}
                onChange={handleChange}
              />

              <FloatingInput
                label='Mandate Area'
                name='mandate_area'
                value={formData.mandate_area}
                onChange={handleChange}
              />

              <FloatingInput
                label='Legal Department Head'
                name='legal_department_head'
                value={formData.legal_department_head}
                onChange={handleChange}
              />

              <FloatingInput
                label='Legal Department Contact'
                name='legal_department_contact'
                value={formData.legal_department_contact}
                onChange={handleChange}
              />
            </div>
          )}

          {isIndividual && (
            <>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <FloatingInput
                  label='Full Name'
                  name='full_name'
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                />

                <FloatingInput
                  label='National ID'
                  name='national_id'
                  value={formData.national_id}
                  onChange={handleChange}
                />

                <FloatingInput
                  label='Passport Number'
                  name='passport_number'
                  value={formData.passport_number}
                  onChange={handleChange}
                />

                <Select3D
                  label='Gender'
                  name='gender'
                  value={formData.gender}
                  onChange={handleChange}
                  options={[
                    { value: 'MALE', label: 'Male' },
                    { value: 'FEMALE', label: 'Female' },
                  ]}
                />

                <FloatingInput
                  label='Occupation'
                  name='occupation'
                  value={formData.occupation}
                  onChange={handleChange}
                />

                <Select3D
                  label='Marital Status'
                  name='marital_status'
                  value={formData.marital_status}
                  onChange={handleChange}
                  options={[
                    { value: 'SINGLE', label: 'Single' },
                    { value: 'MARRIED', label: 'Married' },
                    { value: 'DIVORCED', label: 'Divorced' },
                    { value: 'WIDOWED', label: 'Widowed' },
                  ]}
                />
              </div>

              {isAssistedIndividual && (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <FloatingInput
                    label='Companion Full Name'
                    name='contact_full_name'
                    value={formData.contact_full_name}
                    onChange={handleChange}
                    required
                  />

                  <FloatingInput
                    label='Companion Phone'
                    name='contact_phone_number'
                    value={formData.contact_phone_number}
                    onChange={handleChange}
                    required
                  />

                  <FloatingInput
                    label='Companion Email'
                    name='contact_email'
                    value={formData.contact_email}
                    onChange={handleChange}
                  />

                  <FloatingInput
                    label='Companion National ID'
                    name='contact_national_id_number'
                    value={formData.contact_national_id_number}
                    onChange={handleChange}
                  />

                  <FloatingInput
                    label='Relationship / Role'
                    name='contact_role_or_designation'
                    value={formData.contact_role_or_designation}
                    onChange={handleChange}
                  />
                </div>
              )}
            </>
          )}

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <FloatingInput
              label='Country'
              name='country'
              value={formData.country}
              onChange={handleChange}
            />

            <FloatingInput
              label='County'
              name='county'
              value={formData.county}
              onChange={handleChange}
            />

            <FloatingInput
              label='City'
              name='city'
              value={formData.city}
              onChange={handleChange}
            />

            <FloatingInput
              label='Street'
              name='street'
              value={formData.street}
              onChange={handleChange}
            />

            <FloatingInput
              label='Postal Code'
              name='postal_code'
              value={formData.postal_code}
              onChange={handleChange}
            />

            <FloatingInput
              label='Full Address'
              name='full_address'
              value={formData.full_address}
              onChange={handleChange}
              required={!isAssistedIndividual}
            />
          </div>

          <div className='flex gap-3 pt-4'>
            <Button3D
              type='button'
              variant='secondary'
              onClick={() =>
                navigate(isSecretaryCreate ? '/secretary/clients' : '/admin/clients')
              }
            >
              Cancel
            </Button3D>

            <Button3D type='submit' variant='primary' disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Client'}
            </Button3D>
          </div>
        </form>
      </Card>
    </div>
  );
}
