# Practical walk-in to archive exercise

Use fictional records in the isolated practice database. This is a commercial
debt-recovery exercise; other Kenyan practice areas have different procedures.
Court, process-server and bank activity is represented by exercise records.
Real procedural dates must follow the summons, orders and governing rules.

## Local environment

`config.settings_practice` selects a separate PostgreSQL database ending in
`_practice`, separate media under `/tmp/sheria-practice-media`, console email
and disabled external AI. It does not clear or change the normal database.
It defaults to the isolated local PostgreSQL socket `/tmp`, port `55439`, user
`sheria_test`, database `lawfirm_practice`. Override with `PRACTICE_DB_NAME`,
`PRACTICE_DB_HOST`, `PRACTICE_DB_PORT`, `PRACTICE_DB_USER`,
`PRACTICE_DB_PASSWORD` and `PRACTICE_MEDIA_ROOT` for your local setup.

On a new PostgreSQL installation, create that empty UTF-8 database with your
database administrator. Then, from the repository root:

```sh
server/venv/bin/python server/manage.py migrate --settings=config.settings_practice
server/venv/bin/python server/manage.py seed_practice_firm --settings=config.settings_practice
server/venv/bin/python server/manage.py runserver 127.0.0.1:8001 --settings=config.settings_practice
```

In a second terminal:

```sh
cd client
VITE_DEV_PORT=5174 VITE_API_BASE_URL=http://127.0.0.1:8001/api npm run dev
```

Open `http://localhost:5174/login`. Use separate browser profiles for the four
staff accounts, or sign out before changing roles. The seed refuses to overwrite
an existing practice firm. To repeat the exercise, create another empty practice
database and select it with `PRACTICE_DB_NAME`; do not delete the normal database.

| Role | Email | Local exercise password |
|---|---|---|
| Managing partner | partner@mwangi.test | Practice-2026! |
| Advocate | otieno@mwangi.test | Practice-2026! |
| Secretary | wanjiku@mwangi.test | Practice-2026! |
| Accountant | njeri@mwangi.test | Practice-2026! |

These are synthetic development credentials. The seed provides staff permissions,
Room 201 for the advocate, separate client/office account registers, an example
tax setting and an example privacy notice. It creates **no clients or matters**.
They are practice configurations, not approved production firm policies.

## 1. Receive the walk-in

Sign in as secretary and open **Client arrivals**. Record visitor **Peter Kamau
for Kamau Hardware Limited**, select **Brian Otieno**, and save the arrival.
Leave client record blank because this is a new enquiry.

As advocate, open Client arrivals and select **Ready for next client**. Reception
should see Peter and **Room 201**. As secretary, record **Client ushered in**.
As advocate, record preliminary intake: company director; broad issue: recovery
for unpaid hardware supplies; other party: **Baraka Builders Limited**; contact
details and any actual urgent date. Complete the initial consultation. Keep this
preliminary until conflicts are screened.

Expected: the visit is completed; no instructions have been accepted and no
matter exists.

## 2. Create and link the prospect

As secretary, create a company prospective client named **Kamau Hardware Limited**.
Use **Peter Kamau**, Director, as authorised representative and, if practising
the portal flow, designate him as portal contact. Use `.test` email addresses.
Deliver and record the exercise privacy notice. Do not invent a completed KYC
verification merely to progress.

Return to Client arrivals, select the new client under **Client to link to this
arrival**, and choose **Link client record**. The visit now links to the client
onboarding/proposed-matter workflow. Similar names do not automatically link.

## 3. Conflict review and instruction acceptance

Create proposed instructions: **Recovery of KES 1,850,000 for hardware supplied
on credit from Baraka Builders Limited**. Identify the opponent and relevant
related parties. As advocate, start conflict screening; check the company,
representative and opponent against the available firm records and record the
sources and findings. Only clear after completing the review.

Record acceptance separately, with scope covering demand, suit and enforcement;
exclude appeals unless separately instructed. Conflict clearance alone is not
acceptance, and acceptance alone does not open the matter.

## 4. KYC, assessment, engagement and retainer

As secretary, create/register the physical KYC file and the exercise documents:
incorporation certificate, company information/CR12, KRA PIN and authority to
instruct. Record copy type, verification method and physical location accurately.
Do not register invoices, delivery notes or case evidence as identity documents.

As advocate, review identity, representative authority, beneficial ownership and
applicable due diligence; record whether source-of-funds review is applicable.
Assess limitation, evidence, jurisdiction, ADR, risks and client objectives.
For this exercise record the advocate's supported forum decision for a
KES 1,850,000 commercial claim in Nairobi.

Prepare a signed engagement: example professional fees **KES 150,000**,
estimated disbursements **KES 25,000**, retainer **KES 50,000**. These are exercise
figures, not a fee-scale assessment. Register the signed letter and signatory's
authority. As accountant, post the KES 50,000 pre-matter retainer to the client
account. As partner, approve the engagement. A checkbox cannot replace receipt.

Optional portal exercise: send an invitation using console email, use the local
activation link and set the client's own password. Console email sends no real
message. Staff credentials must never be shared with the client.

## 5. Open and prepare the matter

As advocate, open the matter from the cleared and accepted proposal. Assign
Brian Otieno and Mary Wanjiku. Confirm that it has an internal `MAT-...` reference,
the client is now official and the retainer is allocated to its ledger.

As secretary, register the physical file/location. Request and register invoices,
delivery notes and correspondence as matter evidence. For portal testing, let
the client fulfil a document request, then secretary verifies it and advocate
accepts it; return an incomplete copy and request a replacement to test history.

Use **Controlled lifecycle** on the advocate's matter page for the assessment,
specialised workstream, diary and later closing review. Submit assessments for
partner approval when using that workflow; the preparing advocate cannot approve
their own assessment.

## 6. Demand, filing and proceedings

Issue an exercise demand and record its actual issue date and chosen response
period. Do not imply every Kenyan demand has one mandatory period. Allow the
exercise period to lapse, or use clearly identified historical exercise dates.

If unresolved, prepare the proper pleadings and record external filing using
**Court progress → Filed**: filing date, official court number, station, registry
and exercise fee/payment reference. Keep court and internal references distinct.

Record summons service and the affidavit of service. Enter the **actual appearance
due date from the exercise summons/order**. The system does not add fifteen days.
As advocate, open the provisional deadline and select **Verify date and legal
basis**. Check the service trigger, applicable rules, excluded periods, court
closure/public holidays and any directions before confirming the date.

Record appearance and defence. An estimated defence deadline also requires
advocate verification. Progress through appropriate case-management, pretrial,
hearing, submissions and judgment stages, recording evidence and outcomes.
An adjournment does not mean the hearing completed. A default-judgment path
requires a registered request and a verified expired response deadline.

Record judgment, decree, costs, appeal advice and enforcement position. Suggested
appeal dates are provisional; for an unsupported forum the system creates an
urgent advocate-review reminder rather than omitting appeal review. Record
client instructions and resolve the reviewed deadline before closing. A virtual
hearing link must be supplied from the external court notice; the app does not
create a Judiciary hearing.

## 7. Account for money

As accountant, record exercise recovery **KES 2,035,000** into the client account.
Prepare a fee note for **KES 150,000 professional fees** plus **KES 20,450 example
court disbursements**. With this seed's example 16% VAT setting on fees, the
invoice totals **KES 194,450**. The fee and tax treatment require actual review
in a real firm; the example is not tax advice or a court-fee tariff.

Submit; partner approves; accountant issues the invoice. Record the authorised
client-to-office transfer against the issued invoice. Then request remittance
of **KES 1,890,550** to the client and obtain independent approval. Expected:
50,000 + 2,035,000 − 194,450 − 1,890,550 = **zero client-money balance**.
Record actual reconciliation evidence and final account. Software posting does
not execute or prove an external bank payment.

## 8. Close, then archive

Return originals through the documented release/custody process, or record a
proper authorised retention basis. Resolve tasks, dates, events, undertakings,
invoices, client instructions and appeal/enforcement work.

As advocate, request a formal closing review with result, summary, appeal and
enforcement positions and the checklist. Amend the pending review if necessary;
an amendment invalidates approvals and requires fresh closing outputs. Generate
the **Closing letter** and **Final client statement**, download and inspect them,
and record actual client notification.

As accountant, open **Billing → Financial clearance for closing matters**, refresh
and approve the reviewed account. Unresolved invoices or client funds block this.
As partner, give advocate approval and complete administrative final review.
Expected: **CLOSED**, with versioned documents and retained history.

Archive the closed matter. Enter archive reference, electronic and physical
locations, custodian, access restrictions, applicable retention policy and review
date. Tick each inventory check after checking it. There is no universal
seven-year matter-file rule: accounting-record retention is measured from the
last entry, and special originals, other duties and holds can require longer.
Expected: **ARCHIVED**, accessible through a logged purpose. Stop here for this
exercise; destruction is a separate retention decision.

## Automated verification

`apps.cases.tests.test_end_to_end_litigation` follows one client through the
arrival queue, prospect link, engagement, matter, court records, finance,
closure and archive using the corresponding API actors. It simulates external
activities and does not replace testing live filing/service/banking integrations.
Run backend tests using PostgreSQL for transaction/concurrency coverage:

```sh
TEST_DATABASE_BACKEND=postgresql TEST_DB_NAME=lawfirm_test TEST_DB_USER=sheria_test TEST_DB_PASSWORD='' TEST_DB_HOST=/tmp TEST_DB_PORT=55439 server/venv/bin/python server/test_all.py --noinput
cd client
npm run test -- --run
npm run lint
npm run build
```

Primary legal references and the original review are in
[WALK_IN_TO_ARCHIVE_REVIEW.md](WALK_IN_TO_ARCHIVE_REVIEW.md). Internal approval
sequences are firm controls; apply the current Kenyan law and court directions
for the particular instructions.
