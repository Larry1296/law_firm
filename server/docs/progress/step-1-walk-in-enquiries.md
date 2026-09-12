# Step 1 — Walk-in Enquiry Registration

Implemented a separate pre-client register. Enquiries have no client, conflict-check, consultation, KYC, engagement or matter relationship or conversion action. The only status is `RECEIVED_AWAITING_REVIEW` (Received — awaiting preliminary review).

## API and permissions

Both endpoints support GET (list) and POST (create):

- `/api/admin/clients/walk-in-enquiries/`
- `/api/staff/secretary/clients/walk-in-enquiries/`

GET returns `{ "enquiries": [...] }`, ordered by received time descending, then creation time and UUID. POST returns the created record with HTTP 201, including reference, status label and receiving staff name. Validation errors use the existing `message`, `detail`, and field-specific `errors` envelope. Only JSON submission is supported; there is no upload, update, delete or conversion operation.

Both routes use the same authorization service. Active firm-owning administrators may list and create for their own firm. Secretaries must have system role `STAFF`, an active secretary profile, `can_manage_client_intake`, and an active `MANAGE_CLIENTS` grant. Other users receive HTTP 403. The service resolves the firm and receiving user from authentication; submitted firm, receiver, reference or status values cannot override them.

References use the allocation-time calendar year in Africa/Nairobi, independently of a backdated received timestamp. The service locks the existing firm row before accessing the firm/year sequence, including first allocation in a new year. Sequence, enquiry and immutable `WALK_IN_ENQUIRY_RECORDED` audit event commit atomically. Database constraints enforce firm/reference uniqueness, firm/year sequence uniqueness, acknowledgement and the single status. Audit metadata excludes visitor name, contact, description, organisation name and related-party names.

## Files created

- `server/apps/clients/models/walk_in_enquiry.py`
- `server/apps/clients/serializers/walk_in_enquiry_serializer.py`
- `server/apps/clients/services/walk_in_enquiry_service.py`
- `server/apps/clients/views/walk_in_enquiry_view.py`
- `server/apps/clients/tests/test_walk_in_enquiries.py`
- `server/apps/clients/migrations/0037_walkinenquiry_walkinenquirysequence.py`
- `client/src/modules/clients/enquiries/WalkInEnquiriesPage.jsx`
- `client/src/modules/clients/enquiries/WalkInEnquiriesPage.test.jsx`
- `client/src/modules/clients/enquiries/enquiryForm.js`
- `client/src/modules/clients/enquiries/walkInEnquiryService.js`
- `server/docs/progress/step-1-walk-in-enquiries.md` (this report)

## Files changed

- `server/apps/clients/models/__init__.py` — model registration.
- `server/apps/clients/admin_urls.py` — administrator endpoint.
- `server/apps/staff/secretary_urls.py` — secretary endpoint.
- `client/src/routes/index.jsx` — lazy-loaded workspace routes.
- `client/src/modules/admin/config/adminSidebarLink.js` — owner-only Clients-section navigation.
- `client/src/layouts/staff/secretary/SecretarySidebar.jsx` — Clients-section navigation.

## Verification (12 September 2026)

| Check | Result |
| --- | --- |
| Django system check (`config.settings_test`) | Passed, zero issues |
| `makemigrations --check --dry-run` (`config.settings_test`) | Passed, no changes detected |
| Enquiry backend tests, SQLite | 14 discovered; 13 passed, one row-lock concurrency test skipped |
| Enquiry backend tests, isolated PostgreSQL | All 14 passed, including concurrent first allocation |
| Full backend suite, SQLite | 375 discovered; 348 passed, 27 skipped; no failures |
| Frontend tests (`npm test -- --run`) | All 76 passed across 20 files, including 8 new enquiry tests |
| ESLint (`npm run lint`) | Zero errors; 10 warnings in unchanged files |
| Production build (`npm run build`) | Passed |
| `git diff --check` | Passed |

The full backend command was `server/venv/bin/python server/test_all.py apps.courtroom.tests --noinput --keepdb`, with `TEST_SQLITE_NAME` pointing to an isolated database under `/tmp`. The extra courtroom label includes the standalone module omitted by the repository runner's package-only discovery. No existing tests were changed or weakened. PostgreSQL verification used the existing `config.settings_test` PostgreSQL configuration against an isolated local Unix-socket instance, which was stopped after the tests.

The 27 full-suite skips remain visible; the enquiry concurrency skip on SQLite was separately exercised successfully on PostgreSQL. Existing React hook warnings remain unresolved and unrelated to this feature. The migration was exercised on test databases; apply it to the deployment database before using the new register. Responsive cards/table and light/dark styles reuse the existing components; no separate manual browser visual inspection was performed.
