# Step 1 — Walk-in Enquiry Capture

Step 1 is implemented and remains **not approved** until the real browser workflow is completed. It records a minimal pre-client enquiry only. It does not start conflict screening, consultations, onboarding, matter opening, billing, documents, court procedure or AI features.

The frontend fetches the current versioned Kenya Data Protection Act section 29 notice before rendering personal-data fields. Incomplete firm identity or notice configuration blocks intake. Admins can configure a new policy version; secretaries are told the administrator must complete configuration. The notice covers controller identity, purpose, lawful basis, required and optional information, consequences, recipients and safeguards, retention, rights, privacy contact, transfers and ODPC complaints. Delivery supports SCREEN, READ_ALOUD and PAPER. Acknowledgement is notice-delivery evidence, explicitly separate from consent and lawful basis. A single-use receipt is required to create each enquiry.

The form distinguishes SELF, OTHER and ORGANISATION. It keeps the visitor as the person making the enquiry and conditionally captures the prospective person or organisation, relationship/capacity and preliminary authority status. No national ID, merits evidence or upload is collected. Received time defaults to trusted server time; a different time requires a reason and future-time validation. Administrators can correct approved capture fields only through a reasoned, revision-checked workflow. Previous and replacement values, reason, actor, timestamp and revision are preserved in restricted history. Notice evidence and server fields are immutable; no delete operation exists. Secretaries may view history but cannot correct. Routes reject the wrong role and remain firm-isolated.

## Endpoints

- `GET/POST /api/admin/clients/walk-in-enquiries/`
- `GET/POST /api/staff/secretary/clients/walk-in-enquiries/`
- `GET/PUT /api/admin/clients/walk-in-enquiries/privacy-notice/`
- `GET /api/staff/secretary/clients/walk-in-enquiries/privacy-notice/`
- `POST /api/{admin|staff/secretary}/clients/walk-in-enquiries/notice-deliveries/`
- `GET/POST /api/{admin|staff/secretary}/clients/walk-in-enquiries/{id}/corrections/`

Migration `0038_walkinenquiry_authority_status_and_more.py` adds privacy configuration and delivery evidence, enquiry identity/authority and timing fields, immutable notice snapshots and correction history.

## Fresh verification (14 September 2026)

| Check | Result |
| --- | --- |
| Django system check | Passed, zero issues |
| `makemigrations --check --dry-run` | Passed, no changes detected |
| Step 1 backend tests on PostgreSQL | 30 passed; 2 concurrency tests passed |
| Complete frontend tests | 93 passed across 21 files |
| ESLint | 0 errors; 10 existing warnings |
| Production build | Passed |
| `git diff --check` | Passed |
| Real Chromium browser workflow | Blocked: installed Chromium requires unavailable `libcups.so.2` |

Backend command: `TEST_DATABASE_BACKEND=postgresql TEST_DB_NAME=lawfirm_step1 TEST_DB_USER=step1_test TEST_DB_HOST=/tmp TEST_DB_PORT=55439 server/venv/bin/python server/manage.py test apps.clients.tests.test_walk_in_enquiries --settings=config.settings_test --noinput --keepdb`. Frontend commands from `client/`: `npm test -- --run`, `npm run lint`, and `VITE_API_BASE_URL=http://127.0.0.1:8011/api npm run build`.

The real-browser script is `client/scripts/walk-in-browser.mjs`, with isolated fictional fixtures from `server/scripts/seed_walk_in_browser.py`. It covers admin and secretary configuration, all delivery methods, identity/authority variants, Nairobi timing, responsive layouts, correction history, role controls and refresh persistence. The verification remains blocked: after the missing Chromium libraries were staged under `/tmp`, the isolated SQLite browser database could not be migrated because the repository's existing `cases.0003_initial` migration attempts to add an already-present `created_by_id` column. Step 1 remains unapproved until the browser workflow completes against a clean supported database environment.
