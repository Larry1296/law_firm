# What must be addressed to fully test the intake workflow

Scope: **individual client creation → propose matter → conflict check → create matter.**

Everything below was verified against the code on `arena/019faf01-law-firm`, not
assumed. Items are grouped by whether they *block* testing, *distort* it, or
*leave holes* in it.

---

## STATUS as of commit `88d4e99` (re-audited 2026-07-29)

The repository was updated and **most of this document is now resolved**. Full
suite: **259 tests, 0 failures, 26 skips** via `python test_all.py`.

| Item | Status |
|---|---|
| A1 interpreter floor | **Done** — `.python-version` = 3.13, `pyproject.toml` `requires-python = ">=3.12"` |
| A2 `.env.example` | **Done** — committed at repo root with all required keys |
| A3 test settings | **Done** — `config/settings_test.py`, sqlite default + `TEST_DATABASE_BACKEND=postgresql` |
| A4 `apps/__init__.py` | **Done** |
| A5 runner + CI | **Done** — `test_all.py`, `[tool.pytest.ini_options]`, `.github/workflows/test.yml` (backend on Postgres 17 + frontend lint/test/build) |
| B1 lawyer/secretary routes | **Done** — `create_openable_conflict_check` helper added; 4 tests now pass |
| B2 legacy `CaseConflictCheck` | **Decided** — 25 legacy tests `skip`ped with "Superseded by pre-opening proposed-matter conflict clearance." |
| C1 state machine branches | **Done** — `test_information_potential_escalation_and_close_branches_are_controlled`, `test_illegal_state_transition_is_rejected_without_mutating_history` |
| C2 automatic conflict search | **Done** — `test_automatic_search_blocks_direct_clearance_when_a_name_matches`, `test_automatic_search_threshold_switches_from_manual_to_automatic` |
| C3 client types | **Partly** — `test_all_client_types_map_to_the_correct_screened_party_type` covers all 21 via `_client_party_type`, but only as a **direct service-method call**, not through the creation APIs |
| C6 concurrency | **Done (gated)** — `test_conflict_check_concurrency.py` exists; skips on sqlite, runs on Postgres in CI |
| C9 frontend | **Partly** — `AdminCreateCasePage.test.jsx`, `ClientConflictCheckPage.test.jsx`, payload tests added; CI runs vitest |

### Still open

- **C3 (partial)** — 15 of 23 client-creation endpoints still have no creation
  test (sole proprietorship, partnership, LLP, cooperative, SACCO,
  society/association, non-profit, NGO, trust, estate, public entity,
  international organisation, government, religious, educational). The party-
  type mapping is covered; the *creation serializers* are not.
- **C4** — individual variants still not carried through to a matter:
  `PORTAL_ENABLED` end-to-end, minor+guardian, `acting_for_self=False`,
  PEP/sanctions/EDD branches at conflict and matter time.
- **C5** — `test_universal_matter_creation.py` still builds conflict checks via
  `objects.create()`, bypassing the service layer. The dead ternary at
  `accepted_by=lawyer if 'lawyer' in locals() else self.lawyer` is still there.
- **C7** — authorisation matrix: cross-firm check ID, wrong-client check,
  inactive advocate as `decided_by`/`accepted_by`, lawyer without
  `CREATE_CASES` proposing, client/prospect hitting admin endpoints.
- **C8** — management commands and the `0011` data migration remain untested.
- **New surface** — a jurisdiction-suggestion feature landed
  (`jurisdiction_suggestion_service.py`, 364 lines, + `JurisdictionAssessment`
  model). It has 5 tests and is gated on conflict clearance, so it now sits
  *inside* this workflow and should be folded into the end-to-end path.

The original analysis below is retained for context.

---

## A. Blockers — the environment cannot run the suite as shipped

### A1. Python/Django version floor is unreachable
`requirements.txt` pins `Django==6.0.5`, which requires **Python ≥ 3.12**. Any
box on 3.11 cannot install the pinned stack at all. I had to run on Django
5.2.16 to execute anything.

**Needs:** either document/enforce Python 3.12+ (`python_requires`, a
`.python-version`, or a Docker base image), or relax the Django pin. Right now
there is nothing in the repo that states the interpreter floor.

### A2. No `.env.example`
`.gitignore` line 63 explicitly whitelists `!server/.env.example` — but **the
file does not exist**. `config/settings.py` calls `config("SECRET_KEY")`,
`config("DB_NAME")`, `config("DB_USER")`, `config("DB_PASSWORD")` with no
defaults, so a fresh clone raises `UndefinedValueError` on *any* management
command, including `manage.py test`.

**Needs:** commit `server/.env.example` with every required key.

### A3. No test settings module
Settings hard-code the PostgreSQL engine. There is no `config/settings/test.py`,
no `DATABASES` override, and no sqlite fallback, so running tests requires a
live Postgres with credentials. I worked around this with a throwaway shim
outside the repo.

**Needs:** a committed test settings module (or `DATABASE_URL` support) so
`manage.py test` works on a clean checkout.

### A4. `manage.py test apps` crashes — no package `__init__.py`
`server/apps/__init__.py` **does not exist**. Consequences:

- `manage.py test apps` → `ImportError: 'tests' module incorrectly imported from '.../apps/ai/tests'`
- `manage.py test apps.cases` → `TypeError: expected str, bytes or os.PathLike object, not NoneType`

Only fully-qualified module paths work. I had to enumerate all 37 test modules
by hand to get a full run.

**Needs:** add `apps/__init__.py`. One empty file makes the standard invocation
work.

### A5. No test runner config and no CI
No `pytest.ini`, `setup.cfg`, `pyproject.toml`, `tox.ini`, `conftest.py`, and no
`.github/` directory. Nothing runs these tests automatically, which is why the
regressions in section B went unnoticed.

**Needs:** runner config + a CI workflow that runs backend and frontend tests.

---

## B. Distortions — the suite is red before you start

**32 pre-existing failures** (28 `apps.cases`, 4 `apps.staff`), confirmed present
with my new file excluded. Two distinct root causes, both real product bugs or
real stale tests — you cannot trust a green/red signal on the intake workflow
until these are triaged.

### B1. `apps/staff/tests/test_lawyer_cases_endpoint.py` — 4 failures. **Genuine coverage hole.**
`conflict_check_id` is a **required** field on `CaseCreateSerializer`, and both
`lawyer_cases_view.py` and `secretary_cases_view.py` call the very same
`CaseCreateSerializer` + `CaseService.create_case`. These tests still post
payloads without it and get `400 {'conflict_check_id': ['This field is required.']}`.

Affected: `test_permitted_lawyer_can_create_matter_and_defaults_to_self`,
`test_ordinary_lawyer_cannot_assign_another_responsible_advocate`,
`test_lawyer_with_reassignment_permission_can_assign_another_advocate`,
`test_lawyer_cannot_create_for_cross_firm_client`.

This means **the lawyer and secretary matter-creation routes are currently
untested end-to-end**, even though they are the paths real fee-earners use. My
new test only covers the admin `case-create` route.

Note the tests also assert `matter_status == INSTRUCTIONS_RECEIVED`, whereas the
admin route yields `MATTER_OPEN`. That discrepancy needs a product decision
before the tests are rewritten.

### B2. `apps/cases/tests/test_case_lifecycle_framework.py` (+ `test_cases.py`) — 28 failures. **Two competing conflict models.**
Both models are live simultaneously:

| | Legacy | Current |
|---|---|---|
| Model | `apps/cases/models/case_conflict_check.py` → `CaseConflictCheck` | `apps/clients/models/client_matter_conflict_check.py` → `ClientMatterConflictCheck` |
| Scope | per-case, *after* the case exists | per-client, *before* the case exists |
| Actions | `REVIEW` / `MARK_CLEAR`, `reviewed_by` | `start`/`decide`/`acceptance`, `decided_by`/`accepted_by` |
| Status | `Case.MatterStatus.CONFLICT_CHECK_PENDING` | `ConflictCheckStatus.*` |
| Still routed? | **yes** — `case_conflict_check_view.py` + `CaseConflictCheckService` | yes |

The 28 failures are all the old surface: `'reviewed_by' not found`,
`'REVIEW' not found in []`, `CONFLICT_CHECK_PENDING not found in offered
transitions`, `Cannot transition MATTER_STATUS from MATTER_OPEN to
CONFLICT_IDENTIFIED`.

**Needs a decision before testing is meaningful:** is the legacy per-case
conflict check retired (delete model, service, view, URLs, tests) or retained
for post-opening conflicts that emerge later? Today a matter can be conflict-
checked twice through two unrelated subsystems, and no test asserts how they
interact.

---

## C. Holes in the workflow itself

### C1. Conflict-check state machine is ~40% covered
Ten of the twelve conflict endpoints exist; **five have zero test references**:

| Endpoint | Service method | Tests |
|---|---|---|
| `.../request-information/` | `request_information` | **0** |
| `.../resume/` | `resume_check` | **0** |
| `.../potential/` | `record_potential_conflict` | **0** |
| `.../escalate/` | `escalate_for_review` | **0** |
| `.../close/` | `close_without_decision` | **0** |
| `.../<check_id>/` (GET/PATCH detail) | `update_proposed_matter` | **0** |

Untested transitions in `ALLOWED_TRANSITIONS`:

```
IN_PROGRESS ──▶ AWAITING_INFORMATION ──▶ IN_PROGRESS          ← never tested
IN_PROGRESS ──▶ POTENTIAL_CONFLICT ──▶ ESCALATED_FOR_REVIEW   ← never tested
                                   └──▶ CLEARED               ← never tested
                                   └──▶ CONFLICT_CONFIRMED    ← never tested
any ────────▶ CLOSED_WITHOUT_DECISION                          ← never tested
```

Only the happy path `NOT_STARTED → IN_PROGRESS → CLEARED` and the direct
`→ CONFLICT_CONFIRMED` are exercised. The escalation branch — the one that
actually matters for a contested conflict — is entirely unverified. Also
untested: that *illegal* transitions are rejected (e.g. `NOT_STARTED → CLEARED`
skipping `start`, or mutating a terminal `CLEARED` check).

### C2. The automatic conflict search is completely untested
`_run_automatic_search` + `_search_mode_for_firm` + `AUTOMATIC_SEARCH_MINIMUM_RECORDS = 5`
have **zero** test references. This is the single most important safety
mechanism in the workflow: once a firm holds ≥ 5 records, a name match must
*block* a direct clearance and force a potential-conflict or escalation.

Untested behaviours:
- MANUAL mode below the 5-record threshold vs AUTOMATIC at/above it
- Match against each of the six `ConflictCheckSourceCategory` values
  (`CURRENT_CLIENTS`, `FORMER_CLIENTS`, `OPEN_MATTERS`, `CLOSED_MATTERS`,
  `PROSPECTIVE_CLIENTS`, plus `other_source_description`)
- The substring/bidirectional matching in `contains_term`
- That a hit genuinely produces the "record a potential conflict or escalate"
  `400` instead of clearing

**A real conflict of interest could currently be cleared without any test
noticing.** This is the highest-value gap on the list.

### C3. Only 2 of 21 client types tested through the workflow
`Client.ClientType` has 21 values and `admin_urls.py` exposes **23** creation
endpoints. Tests touch `INDIVIDUAL` and `COMPANY` only; conflict-check tests
touch those two.

Creation tests exist for: individual, company, legal-entity. **Missing for:**
sole proprietorship, partnership, LLP, cooperative, SACCO, society/association,
non-profit, NGO, trust, estate, public entity, international organisation,
government, religious organisation, educational institution.

This matters to the workflow specifically because
`_client_party_type()` branches on `client_type` to decide `PERSON` vs
`ORGANISATION` when auto-adding the client as a screened conflict party — that
branch is only ever tested for two types.

### C4. Individual-creation paths not carried through to a matter
`test_admin_individual_client_creation.py` is solid on creation (21 tests) but
stops there. Not carried into the conflict/matter flow:

- **`PORTAL_ENABLED` individual** — my test covers `ASSISTED` end-to-end; the
  portal variant's promotion `PROSPECT → OFFICIAL_CLIENT` on matter opening is
  only asserted in `test_client_matter_conflict_checks.py` using a *company*
  client built directly via the ORM, never via the individual creation API.
- **Minor client with guardian** (`is_minor` branch + guardian validation)
- **`acting_for_self = False`** — representative capacity, authority document,
  `authority_verified`
- **Enhanced due diligence / PEP / sanctions branches** — `pep_status`,
  `sanctions_screening_status`, `risk_rating`,
  `enhanced_due_diligence_required`. None are checked at conflict or matter
  time; a `CONFIRMED_MATCH` PEP can currently open a matter with no test saying
  whether that is intended.

### C5. Entry routes are not cross-tested with the conflict gate
All five `EntryRoute` values are exercised in
`test_universal_matter_creation.py`, but **that file builds its conflict checks
directly via `ClientMatterConflictCheck.objects.create(...)`**, bypassing the
API and the whole service-layer state machine. So "cleared + accepted" is
asserted through the API for exactly one route (`NEW_INSTRUCTION`, in my test)
and one filed-case path.

Also, `test_universal_matter_creation.py:100` contains a latent bug:
`accepted_by=lawyer if 'lawyer' in locals() else self.lawyer` — `lawyer` is
never a local, so the ternary is dead code. It passes by accident.

### C6. Concurrency and DB-level guarantees unverified
Six `select_for_update()` calls guard the conflict service, and
`_next_reference` has an `IntegrityError` fallback for the
`PMA/CONF/<year>/<n>` sequence. There are three `UniqueConstraint`s on
`Case`/`ClientMatterConflictCheck`.

None of this is tested, and **none of it can be tested on sqlite** —
`select_for_update` is a no-op there. Specifically unverified:
- Two concurrent `case-create` calls racing on the *same* cleared check
  (single-use consumption under contention)
- Reference-number collisions under parallel proposals
- `unique_official_court_case_number_per_firm` (migration 0008)

**Needs:** Postgres in CI plus `TransactionTestCase`-based concurrency tests.

### C7. Cross-firm and authorisation matrix incomplete
Tested: secretary cannot decide a conflict (403). Not tested:
- Cross-firm conflict check ID rejected by `validate_for_case_creation`
  (the `check.firm_id != firm.id` branch)
- Conflict check belonging to a *different client* in the same firm
- An **inactive** advocate as `decided_by` / `accepted_by`
  (`check.decided_by.is_active` branch)
- Lawyer *without* `CREATE_CASES` attempting to propose a matter
- Client/prospect role hitting any admin conflict endpoint
- `get_user_firm` raising `PermissionDenied` for an unattached user

### C8. Data migrations and management commands untested
Zero test references for `purge_case_records`,
`repair_matter_architecture`, `repair_official_case_numbers`, or the
`0011_separate_legacy_internal_matter_numbers` data migration. These rewrite
matter numbers — exactly the identifiers the workflow issues.

### C9. Frontend is effectively untested
Only **two** test files exist in the whole client app:
`ElasticTextInput.test.jsx` and `ClientConflictCheckPage.test.jsx`.

`AdminCreateCasePage.jsx` correctly gates on
`conflictCheck.can_open_matter` and reads `conflict_check` from the route/query
— good, it matches the backend contract — but there is **no test** for it, nor
for `AdminCreateClientPage.jsx`. The UI wiring of the exact workflow you asked
about is unverified. No CI runs `vitest` either.

---

## Suggested order of work

1. **A2 + A3 + A4** — `.env.example`, test settings, `apps/__init__.py`.
   Cheap, and makes the suite runnable by anyone.
2. **B1** — fix the 4 lawyer/secretary tests; this closes a real hole on the
   routes fee-earners use.
3. **C2** — test the automatic conflict search. Highest risk item in the system.
4. **B2** — decide the fate of the legacy `CaseConflictCheck`; resolves 28
   failures and removes the dual-model ambiguity.
5. **C1** — complete the state-machine branches (escalation path especially).
6. **A5 + A1** — CI on Postgres with a pinned interpreter, which then makes
   **C6** possible.
7. **C3/C4/C5/C7** — widen the matrix across client types, access types and
   authorisation.
8. **C8 + C9** — migrations and frontend.

Items 1–3 would take the workflow from "happy path proven" to "trustworthy".
