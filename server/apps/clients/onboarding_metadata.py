from apps.clients.models import (
    Client, ClientBeneficialOwner, ClientDueDiligence, ClientPrivacyRecord,
    ClientRepresentative, ClientSectorProfile, CooperativeClient,
    EducationCurriculum, EducationInstitutionProfile, InternationalOrganizationClient,
    PublicEntityClient,
)


def _choices(choices, descriptions=None):
    descriptions = descriptions or {}
    return [{"value": value, "label": label, "description": descriptions.get(value, "")} for value, label in choices]


CANONICAL_CLIENT_TYPES = [
    Client.ClientType.INDIVIDUAL, Client.ClientType.SOLE_PROPRIETORSHIP,
    Client.ClientType.COMPANY, Client.ClientType.PARTNERSHIP,
    Client.ClientType.LIMITED_LIABILITY_PARTNERSHIP, Client.ClientType.COOPERATIVE,
    Client.ClientType.SOCIETY_OR_ASSOCIATION, Client.ClientType.NON_PROFIT_ORGANIZATION,
    Client.ClientType.TRUST, Client.ClientType.ESTATE, Client.ClientType.PUBLIC_ENTITY,
    Client.ClientType.INTERNATIONAL_ORGANIZATION, Client.ClientType.OTHER_REQUIRES_REVIEW,
]

CLIENT_TYPE_LABELS = {
    "INDIVIDUAL": "Individual / Natural Person",
    "SOLE_PROPRIETORSHIP": "Sole Proprietor / Registered Business",
    "COMPANY": "Company / Corporate Body",
    "PARTNERSHIP": "Partnership",
    "LIMITED_LIABILITY_PARTNERSHIP": "Limited Liability Partnership (LLP)",
    "COOPERATIVE": "Co-operative Society",
    "SOCIETY_OR_ASSOCIATION": "Registered Society / Association",
    "NON_PROFIT_ORGANIZATION": "Public Benefit Organization (PBO)",
    "TRUST": "Trust / Trustees",
    "ESTATE": "Estate of a Deceased Person",
    "PUBLIC_ENTITY": "Public / Statutory Entity",
    "INTERNATIONAL_ORGANIZATION": "International Organization",
    "OTHER_REQUIRES_REVIEW": "Other legally recognized person or body — classification review required",
}


def onboarding_metadata():
    descriptions = {
        "INDIVIDUAL": "A natural person retaining the firm in their own legal capacity.",
        "SOLE_PROPRIETORSHIP": "An individual proprietor operating under a registered or trading business name.",
        "COMPANY": "A Kenyan or foreign incorporated company or corporate body.",
        "OTHER_REQUIRES_REVIEW": "Use only where the legal capacity cannot yet be established; acceptance is blocked pending review.",
    }
    return {
        "schema_version": "2026.1",
        "legal_client_types": [{"value": value, "label": CLIENT_TYPE_LABELS[value], "description": descriptions.get(value, "")} for value in CANONICAL_CLIENT_TYPES],
        "access_types": _choices([(Client.AccessType.ASSISTED, "Assisted"), (Client.AccessType.PORTAL_ENABLED, "Portal enabled")]),
        "classification_review_statuses": _choices(Client.ClassificationReviewStatus.choices),
        "representative_categories": _choices(ClientRepresentative.RepresentativeCategory.choices),
        "sectors": _choices(ClientSectorProfile.Sector.choices),
        "cooperative_subtypes": _choices(CooperativeClient.CooperativeSubtype.choices),
        "public_entity_subtypes": _choices(PublicEntityClient.PublicEntitySubtype.choices),
        "international_organization_types": _choices(InternationalOrganizationClient.OrganizationType.choices),
        "education_regimes": _choices(EducationInstitutionProfile.Regime.choices),
        "education_ownerships": _choices(EducationInstitutionProfile.Ownership.choices),
        "basic_education_levels": _choices([
            ("PRE_PRIMARY", "Pre-Primary"), ("PRIMARY", "Primary"), ("JUNIOR_SCHOOL", "Junior School"),
            ("SENIOR_SCHOOL", "Senior School"), ("SPECIAL_NEEDS_EDUCATION", "Special Needs Education"),
            ("ADULT_CONTINUING_EDUCATION", "Adult & Continuing Education"),
            ("ALTERNATIVE_NON_FORMAL", "Alternative / Non-formal Education"), ("MOBILE_SCHOOL", "Mobile School"),
            ("OTHER_RECOGNIZED_BASIC_EDUCATION", "Other recognized basic-education programme"),
        ]),
        "university_categories": _choices(EducationInstitutionProfile.UniversityCategory.choices),
        "tvet_categories": _choices(EducationInstitutionProfile.TVETCategory.choices),
        "curriculum_frameworks": _choices(EducationCurriculum.Framework.choices),
        "beneficial_ownership_modes": _choices(ClientBeneficialOwner.OwnershipMode.choices),
        "identity_verification_statuses": _choices(ClientDueDiligence.IdentityVerificationStatus.choices),
        "pep_statuses": _choices(ClientDueDiligence.PepStatus.choices),
        "screening_statuses": _choices(ClientDueDiligence.ScreeningStatus.choices),
        "risk_ratings": _choices(ClientDueDiligence.RiskRating.choices),
        "privacy_lawful_bases": _choices(ClientPrivacyRecord.LawfulBasis.choices),
        "deprecated_client_types": [choice.value for choice in Client.ClientType if choice.value not in CANONICAL_CLIENT_TYPES],
    }
