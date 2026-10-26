# Sheria Master: structure and Kenyan practice walkthrough

Review date: 26 October 2026. This describes the checked-out implementation,
including existing uncommitted work. It is a workflow review, not a certification
that every practice area or legal deadline is compliant.

## Purpose and structure

Sheria Master manages a firm's prospective clients, accepted instructions,
matters, people, documents, diary, communications, money and records. A matter
can be litigation, advisory or transactional work; not every matter is a lawsuit.
The system records external court filing, service and bank activity; recording
an event does not itself perform that external act.

* `client/`: React 19/Vite frontend with public, platform, firm administrator,
  advocate, secretary, accountant, HR, IT and client workspaces.
* `server/`: Django REST API. Apps cover clients, cases, staff, firm, billing,
  documents, communications, courtroom, events, scheduling, tasks, notifications,
  reports, authentication, permissions, audit, subscriptions, tutorials and AI.
* API views receive requests; serializers validate input; services apply business
  rules; models store records. Firm and matter access restrictions apply throughout.
* PostgreSQL is the documented production and concurrency-test database. The
  default fast backend suite uses SQLite.
* `docs/MATTER_LIFECYCLE.md` describes lifecycle controls; `docs/client-arrivals.md`
  describes reception. The README's older “planned” module list is outdated.

## Fictional client walkthrough

Scenario: Kamau Hardware Limited instructs the firm to recover KES 1,850,000
from Baraka Builders Limited. Names, amounts, bank references and documents in
automated tests are synthetic. Court and banking steps are simulated records.

| Stage | Responsible person | Work and evidence |
|---|---|---|
| Arrival | Reception/secretary | Record visitor, arrival time, advocate and urgency; follow the consultation queue. |
| Preliminary intake | Designated receptionist or assigned advocate | Record broad issue, party names and urgent dates; restrict sensitive detail pending conflict clearance. |
| Prospect | Authorised intake staff | Create/select company and representative, deliver privacy notice; avoid duplicate entities. Portal access is separate. |
| Conflict and acceptance | Advocate | Check client, representative, opponent and related parties; record scope, sources and decision. Record acceptance separately. |
| Identity and authority | Staff collect; advocate reviews | Check incorporation, company information and representative authority; record beneficial ownership and risk-based due diligence as applicable. Keep KYC separate from case evidence. |
| Legal assessment | Advocate | Review limitation, evidence, merits, territorial/subject/pecuniary jurisdiction, remedy, proportionality and ADR. Record advice and instructions. |
| Engagement | Advocate/client; authorised approver | Agree scope, exclusions, fees, disbursements, reporting and retainer. Record signed engagement and approval. Finance records actual money received. |
| Matter opening | Authorised advocate | Open only after required gates pass. Assign team, internal file number, physical location, tasks and deadlines. Internal reference is distinct from court number. |
| Evidence | Client, secretary, advocate | Request records, upload/register copies, verify and review. Track physical originals and custody separately. |
| Pre-action | Advocate | Issue authorised demand, record dispatch/service and chosen response date. Negotiate or use ADR where appropriate. Settlement may conclude the matter here. |
| Suit, if necessary | Advocate; external registry/process server | Verify forum and procedure, prepare and externally file pleadings, record official references, serve process, preserve proof and diary actual applicable deadlines. |
| Proceedings | Advocate/support team | Record responses, directions, disclosure/pretrial steps, hearings, submissions and client reports. Record adjournments and interlocutory decisions accurately. |
| Outcome | Advocate | Record judgment/consent/settlement, decree, costs, appeal advice and instructions. Judgment alone does not establish payment or completed enforcement. |
| Financial completion | Accountant and authorised independent approver | Receipt recovery into client account; issue approved fee note; record lawful transfers and client remittance; reconcile and prepare final account. |
| Closure | Advocate, finance, administrator | Resolve work, undertakings, diary items, appeal/enforcement position, money and originals; issue closing letter and final statement; obtain approvals and formally close. |
| Archive | Authorised records custodian | Record archive reference, physical/electronic locations, restrictions, retention basis and review date. Preserve legal holds. Archive does not mean destroy. |

## Automated coverage at the original review

`server/apps/cases/tests/test_end_to_end_litigation.py` contains
`EndToEndLitigationTests.test_walk_in_to_archive`. It changes API actor between
secretary, advocate, accountant, managing partner and client, and drives one
company prospect through to `ARCHIVED`.

The test starts at prospective-client creation. It does not include the separate
arrival queue. `server/apps/clients/tests/test_client_visits.py` tests that queue
and its receptionist/advocate permissions separately. These do not establish a
single browser journey from arrival through archive, nor do they verify real
Judiciary filing, process service, banking or delivery to external recipients.

The example accounts for KES 50,000 retainer plus KES 2,035,000 recovery, an
example KES 194,450 fee/disbursement invoice, and KES 1,890,550 remittance,
leaving a zero client ledger. Those figures are test fixtures, not a court fee
assessment, fee-scale calculation or tax opinion.

Governance tests separately exercise blocked premature closure, outstanding
client money, reopening reasons, versioned closing PDFs, archive eligibility,
legal holds and preservation of destruction metadata.

### Executed verification

On 26 October 2026, ran `server/venv/bin/python server/test_all.py --noinput`:
600 tests discovered, suite successful, 26 skipped (574 executed successfully).
This includes the API litigation journey and separate reception/governance tests.
The database backend was SQLite; PostgreSQL-specific concurrency coverage was
not established. Django also warned that the configured `server/static` directory
does not exist. No browser interaction or real external transaction was tested.

## Original Kenyan practice qualifications and review findings

1. **Appearance deadline:** `FilingRegisterService.APPEARANCE_DAYS` is fixed at
   15, and the end-to-end test asserts that behaviour. Order 6 rule 1 refers to
   the time prescribed in the summons. The actual summons, court orders and
   applicable time-computation rules must govern the diary. Passing this test
   does not validate the fixed period as a universal rule.
2. **Other deadlines:** review forum-specific appeal routes, triggering events,
   excluded time, extensions and court directions before relying on automatic
   calendar-day arithmetic. This walkthrough has not validated every route.
3. **Engagement and approval:** the application's signed-engagement gates and
   maker/checker settings are firm controls. Do not describe every application
   approval as a statutory requirement. Remuneration agreements must be reviewed
   against section 45 of the Advocates Act and applicable remuneration rules.
4. **Client money:** distinguish client and office money, authorised withdrawals,
   bills, receipts, actual bank clearance and reconciliations. A posted software
   transaction is not independent evidence that a bank payment occurred.
5. **Retention:** the test's seven-year policy is an example firm policy, not a
   universal Kenyan file-retention law. Advocates Accounts Rules rule 14 requires
   relevant accounting books/records to be kept for at least six years from the
   last entry. Apply other duties, document type, limitation exposure and holds;
   the Data Protection Act also limits unnecessary personal-data retention.
6. **Professional review:** confirm current practising status and applicable
   confidentiality, conflict, AML/KYC, remuneration and procedural obligations
   for the actual instructions. Different practice areas require different paths.

## Primary reference material

* [LSK professional conduct code, hosted by the Advocates Complaints Commission](https://www.acc.go.ke/sites/default/files/downloads/LSK-Code-of-Conduct-SOPPEC.pdf)
* [Civil Procedure Rules, Kenya Law](https://kenyalaw.org/kl/fileadmin/pdfdownloads/151-CIVIL_PROCEDURE_RULES__2010.pdf)
* [Advocates Accounts Rules, Kenya Law](https://new.kenyalaw.org/akn/ke/act/ln/1966/137/eng@2022-12-31/source)
* [Data Protection Act, Kenya Law](https://new.kenyalaw.org/akn/ke/act/2019/24/eng@2019-11-15/source)

Official search extracts were available during this review; some full-text
Kenya Law fetches were blocked. Verify the current consolidated text when
implementing deadline or legal-policy changes.

## Implementation follow-up

The identified workflow gaps were addressed after the original review:

* Appearance dates now come from the summons/order; calculated court dates are
  provisional until an authorised advocate records the verified date and basis.
  Legacy open court dates are flagged for review without overwriting them.
* Default-judgment prompts and transitions require a verified expired response
  date. Unsupported forums receive an urgent appeal-review reminder.
* The continuous API exercise now starts with arrival, advocate call, secretary
  ushering, intake and consultation, and links that visit to the new prospect.
* Advocates have lifecycle controls on their matter page; accountants have a
  financial-closing review queue. Pending closing reviews can be amended,
  invalidating previous approvals and requiring fresh outputs.
* Generated closing documents are listed for authenticated download. Creating a
  document receipt no longer incorrectly marks a final client account prepared.
* Archive inventory checks require explicit confirmation. Retention assessments
  are blank until completed; archive dates and custodian ownership are validated.
* Internal legal/closure/diary access follows assigned-matter restrictions.
* A separate UTF-8 PostgreSQL practice environment and staff seed support a fresh
  manual exercise with zero clients and matters. Test PostgreSQL creation also
  explicitly requests UTF-8.

Use [END_TO_END_WALKTHROUGH.md](END_TO_END_WALKTHROUGH.md) for the current manual
exercise and startup instructions. The original test result above is historical;
see the implementation delivery for final verification results. This work does
not certify every Kenyan practice area or replace review of actual court dates.
