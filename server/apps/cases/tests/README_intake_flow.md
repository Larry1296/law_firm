# Client Intake → Proposed Matter → Conflict Check → Matter

Reference walkthrough of the intake pipeline as it is actually enforced by the
codebase. The executable version lives in
`apps/cases/tests/test_client_intake_to_matter_flow.py`.

## Step 1 — Create the individual client

`POST /api/admin/clients/individuals/create/` → `admin-individual-client-create`

- Serializer: `IndividualAdminCreateClientSerializer`
- Service: `ClientAdminCreateService.create_client`
- Writes `Client` + `IndividualClient` + `ClientAddress` + `ClientContact`
  (next of kin) + `ClientDueDiligence` in one transaction.

Access-type branches:

| `access_type`    | Portal `User` | `temp_password` | Notes |
|------------------|---------------|-----------------|-------|
| `ASSISTED`       | none          | `null`          | No email may be supplied at all; privacy notice must be `PAPER` or `VERBAL`; contact channel must be `IN_PERSON` or `PHONE`. |
| `PORTAL_ENABLED` | `PROSPECT`    | returned once   | Requires email **and** phone; `onboarding_method` must be `STAFF_ASSISTED`; privacy notice must be `PORTAL`. |

Post-conditions asserted:

- `client_type == INDIVIDUAL`, `lifecycle_status` is `PROSPECT`/`PROSPECTIVE`
- `is_verified is False`
- `client.cases` is empty and `client.matter_conflict_checks` is empty

A client is a legal entity, not a matter. Creating one opens nothing.

## Step 2 — Propose a matter

`POST /api/admin/clients/<client_id>/conflict-checks/` → `admin-client-conflict-checks`

- Serializer: `ProposedMatterSerializer`
- Service: `ClientMatterConflictService.create_proposed_matter`

Creates a `ClientMatterConflictCheck`, **not** a `Case`:

- `reference_number` is firm-scoped and sequential: `PMA/CONF/<year>/<nnnn>`
- `status = NOT_STARTED`, `acceptance_decision = PENDING`
- `created_case` is null, `consumed_at` is null
- The prospective client **and** each proposed adverse party are persisted as
  `ConflictCheckParty` rows (so a payload with one adverse party yields two)
- Validation requires at least one `PROPOSED_ADVERSE_PARTY`, unless
  `no_adverse_party_currently_known` is set with an explanation
- `ConflictCheckHistory` gets a `PROPOSED_MATTER_CREATED` entry

One client may hold many independent proposed matters.

## Step 3 — Perform the conflict check

State machine (`ClientMatterConflictService.ALLOWED_TRANSITIONS`):

```
NOT_STARTED ─▶ IN_PROGRESS ─┬─▶ CLEARED                (terminal)
                            ├─▶ CONFLICT_CONFIRMED     (terminal)
                            ├─▶ AWAITING_INFORMATION ─▶ IN_PROGRESS
                            ├─▶ POTENTIAL_CONFLICT ─▶ ESCALATED_FOR_REVIEW ─┬─▶ CLEARED
                            │                                              └─▶ CONFLICT_CONFIRMED
                            └─▶ CLOSED_WITHOUT_DECISION (terminal)
```

Endpoints: `.../start/`, `.../request-information/`, `.../resume/`,
`.../potential/`, `.../escalate/`, `.../decide/`, `.../close/`.

`decide/` with `CLEARED` requires `names_checked`, `source_categories_checked`,
`result_summary` and `decision_confirmation`. If the firm holds ≥ 5 searchable
records the service runs `_run_automatic_search` and **refuses a direct
clearance** when any name matches — the advocate must record a potential
conflict or escalate instead.

Only an **active advocate** (`Lawyer`) of the firm may decide; a secretary
receives `403`.

### Firm acceptance is a separate decision

`POST .../conflict-checks/<check_id>/acceptance/`

Conflict clearance ≠ instruction acceptance. `ACCEPTED` requires
`scope_confirmation` and an `engagement_status` other than `NOT_STARTED`, and
stamps `accepted_by` / `accepted_at`. Terminal acceptance decisions cannot be
silently edited; every change is journalled to `FirmAcceptanceHistory`.

`GET .../conflict-checks/cleared-unconsumed/` lists the checks that are cleared,
accepted and not yet consumed — i.e. those eligible to open a matter.

## Step 4 — Open the matter

`POST /api/cases/create/` → `case-create`

`ClientMatterConflictService.validate_for_case_creation` is the gate. It rejects
the request unless **all** of the following hold:

1. `conflict_check_id` supplied (the field is mandatory on `CaseCreateSerializer`)
2. Check belongs to the same firm and the same client
3. `status == CLEARED` and `decision_confirmation is True`
4. `decided_by` is an active advocate of this firm
5. `acceptance_decision == ACCEPTED` with `accepted_by` and `accepted_at` set
6. The check is unconsumed (`created_case` and `consumed_at` both null)

On success `consume_for_case` links the check to the case, stamps
`consumed_at`, and logs `CONSUMED_FOR_CASE`. The check is therefore
**single-use** — a replay returns `400`.

Side effects of a successful open:

- Internal matter number issued as `MAT-<year>-<n>`, always distinct from
  `official_court_case_number`
- `matter_status = MATTER_OPEN`; `court_stage = NOT_FILED` for a
  `NEW_INSTRUCTION`, or `FILED` for `EXISTING_FILED_COURT_CASE`
- `CaseParty` rows for our client and the adverse party, with roles mapped to
  the procedure track (e.g. small claims → `CLAIMANT`/`RESPONDENT`)
- Client is promoted to `LifecycleStatus.OFFICIAL`; a linked portal user is
  promoted to `UserRole.OFFICIAL_CLIENT`. `is_verified` stays `False` —
  identity verification is a separate concern.

A `CONFLICT_CONFIRMED` check is terminal, can never open a matter, and does
**not** reject the client — it surfaces under `admin-rejected-matters`.
