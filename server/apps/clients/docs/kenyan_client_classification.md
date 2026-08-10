# Kenyan client onboarding domain

Sheria Master models `Legal Client → Representatives / Authority → Ownership and CDD → Sector / Regulatory Profiles`. `Client.client_type` answers who retains the advocate. A sector profile answers what the client operates. A representative answers which natural person may instruct. Beneficial-owner records answer who ultimately owns or controls an applicable entity.

All onboarding creates a `PROSPECTIVE` client. Proposed instructions, conflict checking, firm acceptance, and matter opening remain separate gated stages. Classification review blocks an unresolved legal form from being treated as accepted merely because a record exists.

## Canonical legal forms

| Legal type | Backend profile | Frontend form | Representatives | Beneficial owners | Regulatory overlays |
|---|---|---|---|---|---|
| `INDIVIDUAL` | `IndividualClient` | Individual / Natural Person | Guardian/agent when applicable | Not normally applicable | Any applicable sector |
| `SOLE_PROPRIETORSHIP` | `SoleProprietorshipClient` | Sole Proprietor / Registered Business | Proprietor/agent | Proprietor identified | Sector profiles |
| `COMPANY` | `CompanyClient` | Company / Corporate Body | Directors/officers/agents | Repeatable; ownership and control tests | Education and other sectors |
| `PARTNERSHIP` | `PartnershipClient` | Partnership | Repeatable partners/agents | When CDD requires | Sector profiles |
| `LIMITED_LIABILITY_PARTNERSHIP` | `LimitedLiabilityPartnershipClient` | LLP | Designated/other partners | Repeatable LLP capital/profit/control tests | Sector profiles |
| `COOPERATIVE` | `CooperativeClient` | Co-operative Society | Repeatable officers | When applicable | SACCO is a subtype; financial overlay |
| `SOCIETY_OR_ASSOCIATION` | `SocietyAssociationClient` | Registered Society / Association | Repeatable officials | Effective control where applicable | Religion/faith or other sector |
| `NON_PROFIT_ORGANIZATION` | `NonProfitOrganizationClient` | Public Benefit Organization (PBO) | Repeatable PBO officials | Control/governance where applicable | Public-benefit sectors |
| `TRUST` | `TrustClient` | Trust / Trustees | Repeatable trustees | Settlor, trustees, beneficiaries/classes, ultimate control as CDD requires | Sector profiles |
| `ESTATE` | `EstateClient` | Estate of a Deceased Person | Repeatable executors/administrators | Not fabricated | Sector profiles if relevant |
| `PUBLIC_ENTITY` | `PublicEntityClient` | Public / Statutory Entity | Authorized public officers | Explicitly not applicable where none exist | Education and other overlays |
| `INTERNATIONAL_ORGANIZATION` | `InternationalOrganizationClient` | International Organization | Authorized representative | Applicability recorded by CDD | Sector profiles |
| `OTHER_REQUIRES_REVIEW` | Base client plus evidence | Classification-review path | As known | As known | As known |

## Education overlay

`EducationInstitutionProfile` never replaces the underlying legal client. It supports Basic Education, University, TVET, Teacher Education, Adult & Continuing Education, and Other Recognized Education. Basic education levels are repeatable. `EducationCurriculum` separately records Kenya CBE/CBC, foreign/international, multiple, special/adapted, or other approved curricula. University CUE categories and statutory TVET categories are controlled values. Private institutions require the legal operator; constituent colleges require a parent university.

Examples: `Greenfields Education Limited` is a `COMPANY`; `Greenfields Academy` is its education profile. A SACCO is `COOPERATIVE + subtype SACCO`. A church is classified by its actual society/trust/PBO/company/statutory vehicle and may receive a religion/faith sector profile.

## Legacy migration

Legacy values remain readable but are absent from onboarding metadata. `SACCO` is safely normalized to `COOPERATIVE`. Sector/capacity values `EDUCATIONAL_INSTITUTION`, `RELIGIOUS_ORGANIZATION`, `FINANCIAL_INSTITUTION`, `NGO_ASSOCIATION`, `REPRESENTATIVE`, and `BUSINESS_ENTITY` are changed to `OTHER_REQUIRES_REVIEW`, preserving `legacy_client_type`. Earlier assumed government, international-entity, and NGO conversions are marked for review unless evidence is subsequently recorded. Historical NGO identifiers remain profile data and new UI terminology is PBO.

## Field parity categories

The nested onboarding contract groups fields into `client`, `legal_profile`, `representatives`, `contacts`, `addresses`, `beneficial_owners`, `due_diligence`, `privacy`, and `regulatory_profiles.education`. These are user-entered during creation and are returned by `ClientDetailSerializer`. IDs, timestamps, verifier identities, lifecycle promotion, and audit timestamps are system/verification generated. `legacy_client_type` is legacy-only. Verification cannot be asserted without source/evidence/date/verifier. Regulator checks are manual unless a future explicit integration is implemented.

The authoritative choices and human labels are returned by the role-scoped onboarding metadata endpoints. The shared Admin/Secretary wizard consumes that contract; it does not expose deprecated values.
