# Step 2 — Lawyer Preliminary Review

Step 2 is implemented as a controlled review of a Step 1 walk-in enquiry. It remains separate from conflict screening and from the advocate's conflict-of-interest decision. The review records only identity, capacity, broad proposed work, parties, broad forum, urgency and a short non-confidential note.

An administrator or authorised intake administrator can assign an active same-firm lawyer. Reassignment requires a reason and is retained in immutable review history. Only the assigned lawyer can record a disposition. The five dispositions are proceed to conflict screening, request minimum information, refer elsewhere, decline at the preliminary stage and urgent review required. Each disposition requires a reason, deciding lawyer and server timestamp. Reception and secretary views show the administrative outcome without the lawyer's restricted reason.

Proceeding authorises either immediate lawyer creation or an explicit secretary creation task. Conversion locks the enquiry and review, creates or links a prospective internal client and creates the canonical `ClientMatterConflictCheck` in `NOT_STARTED` (awaiting conflict screening). The transaction is idempotent and does not create a portal account, KYC record, engagement, case or accepted instruction. A matching prospect is reused only when authorised staff provide a verification basis; a name alone never merges records.

An optional physical-file control records the reference, opened date, opener, location, custody holder and movement history. Its label is `PROSPECTIVE — CONFLICT/ACCEPTANCE PENDING`. No physical file is required to record reception or preliminary review, and no file contents are uploaded.

## Verification

| Check | Result |
| --- | --- |
| Django system check | Passed, zero issues |
| `makemigrations --check --dry-run` | Passed, no changes detected |
| Targeted PostgreSQL Step 2 tests | 60 passed |
| Complete backend suite on PostgreSQL | 409 passed; 25 skipped |
| Complete frontend tests | 108 passed across 22 files |
| ESLint | 0 errors; 10 existing warnings |
| Production build | Passed |
| `git diff --check` | Passed |
| Real-browser workflow | Blocked: the isolated SQLite browser database cannot apply the repository's existing `cases.0003_initial` migration (`duplicate column name: created_by_id`) |

The Step 2 browser UI is covered by responsive frontend tests at 320px and wider layouts, including administrator assignment, lawyer dispositions, secretary follow-up and authorised conversion controls. A real-browser pass must still be completed against a clean supported database environment. Step 1 therefore remains unapproved, and this report does not claim browser approval.
