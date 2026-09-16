"""Minimal identity schema shared by API validation and the creation UI."""
from apps.clients.models import PartnershipClient


def field(key, label, required=False, options=None):
    return {"key": key, "label": label, "required": required, **({"options": options} if options else {})}


PROSPECTIVE_PROFILES = {
    "INDIVIDUAL": {"name_field": None, "fields": [field("preferred_name", "Preferred / other names")]},
    "SOLE_PROPRIETORSHIP": {"name_field": "registered_business_name", "fields": [field("proprietor_name", "Proprietor legal name", True), field("trading_name", "Business / trading name", True), field("business_registration_number", "Registration identifier (if available)")]},
    "COMPANY": {"name_field": "company_name", "fields": [field("trading_name", "Trading name"), field("registration_number", "Company registration number (if available)"), field("country_of_incorporation", "Country of incorporation", True)]},
    "PARTNERSHIP": {"name_field": "partnership_name", "fields": [field("registration_number", "Registration number (if available)"), field("subtype", "Partnership type", True, [{"value": v, "label": l} for v, l in PartnershipClient.PartnershipSubtype.choices])]},
    "LIMITED_LIABILITY_PARTNERSHIP": {"name_field": "registered_name", "fields": [field("llp_registration_number", "LLP registration number (if available)")]},
    "COOPERATIVE": {"name_field": "registered_name", "fields": [field("registration_number", "Registration number (if available)"), field("regulator_name", "Regulator (if known)")]},
    "SOCIETY_OR_ASSOCIATION": {"name_field": "legal_name", "fields": [field("common_name", "Common / trading name"), field("registration_number", "Registration number (if available)"), field("registration_authority", "Regulator (if known)")]},
    "NON_PROFIT_ORGANIZATION": {"name_field": "registered_name", "fields": [field("registration_number", "Registration number (if available)"), field("registration_authority", "Regulator (if known)")]},
    "TRUST": {"name_field": "trust_name", "fields": []},
    "ESTATE": {"name_field": "estate_name", "fields": [field("deceased_full_name", "Deceased person’s legal name", True)]},
    "PUBLIC_ENTITY": {"name_field": "official_name", "fields": [field("enabling_instrument", "Establishing law / identifier (if known)")]},
    "INTERNATIONAL_ORGANIZATION": {"name_field": "official_name", "fields": [field("founding_instrument", "Establishing instrument / status (if known)")]},
    "OTHER_REQUIRES_REVIEW": {"name_field": None, "fields": []},
}

REPRESENTATIVE_TYPES = {
    "COMPANY": ["DIRECTOR", "COMPANY_SECRETARY", "AUTHORIZED_AGENT"],
    "PARTNERSHIP": ["PARTNER", "AUTHORIZED_AGENT"],
    "LIMITED_LIABILITY_PARTNERSHIP": ["DESIGNATED_PARTNER", "PARTNER", "AUTHORIZED_AGENT"],
    "COOPERATIVE": ["COOPERATIVE_OFFICER", "AUTHORIZED_AGENT"],
    "SOCIETY_OR_ASSOCIATION": ["SOCIETY_OFFICIAL", "AUTHORIZED_AGENT"],
    "NON_PROFIT_ORGANIZATION": ["PBO_OFFICIAL", "AUTHORIZED_AGENT"],
    "TRUST": ["TRUSTEE", "AUTHORIZED_AGENT"],
    "ESTATE": ["EXECUTOR", "ADMINISTRATOR", "AUTHORIZED_AGENT"],
    "PUBLIC_ENTITY": ["AUTHORIZED_PUBLIC_OFFICER", "ACCOUNTING_OFFICER", "COUNTY_ATTORNEY", "ATTORNEY_GENERAL_REPRESENTATIVE"],
    "INTERNATIONAL_ORGANIZATION": ["AUTHORIZED_AGENT"],
    "SOLE_PROPRIETORSHIP": ["PROPRIETOR", "AUTHORIZED_AGENT"],
    "INDIVIDUAL": ["AUTHORIZED_AGENT"],
    "OTHER_REQUIRES_REVIEW": ["AUTHORIZED_AGENT", "OTHER"],
}
