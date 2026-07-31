# Next-Action Automation — Kenyan Debt-Recovery Follow-up

## Scope

Add the following requirements to the current next-action and case-lifecycle work. These are required for a newly opened, unfiled liquidated trade-debt matter.

### 1. Make the demand letter the first recommended action

For an unfiled debt-recovery matter where no demand has yet been issued, the headline next action must be **Issue demand letter**, not **Filing**.

- Capture or select the demand period (7, 14, or 21 days; default to the firm's configured period).
- Set the demand-response deadline from the issue date and selected period.
- Recommend preparing/filing the plaint only after the demand period expires without satisfactory payment or settlement.
- If a valid demand was already issued, do not create a duplicate; use its recorded expiry date to determine the next action.
- Keep Judiciary e-filing external to Sheria Master. The system records filing facts after filing; it does not file into Judiciary CTS.

Acceptance criteria:

- A newly opened, unfiled debt matter with no demand letter shows **Issue demand letter** as its next action.
- The next-action display includes a concrete due date once the demand period is known.
- **Filing** becomes the recommended next action only after the demand deadline has expired (or an authorised user records that demand is unnecessary/already satisfied for workflow purposes).

### 2. Surface the limitation date in the Case Lifecycle Summary

The case's recorded `limitation_date` must be treated as a key deadline and must not result in **Key deadline: None pending** while it is still current.

- Include the limitation date when selecting the lifecycle summary's key deadline.
- Display it with a clear label such as **Limitation deadline**.
- Give limitation a suitably high risk priority; nearer operational deadlines may lead the summary, but the limitation date must remain visibly available.
- Show an overdue/expired state when the date has passed rather than hiding it.
- Ensure the value is sourced from the matter record and remains visible for an unfiled case.

Acceptance criteria:

- A matter with `limitation_date: 2032-06-30` displays **30 Jun 2032** in the Case Lifecycle Summary.
- The summary never says **None pending** when a current limitation date exists.
- Tests cover current, missing, and expired limitation dates.

### 3. Seed debt-recovery deadlines and tasks

Do not leave **Deadlines and Tasks** empty for a live debt-recovery matter. Seed tasks progressively and avoid duplicates when the workflow is recalculated.

At matter opening / pre-action:

- Create **Issue demand letter**.
- Once issued, create the demand-response deadline using the selected 7/14/21-day period.
- On expiry without resolution, create **Prepare and file plaint** (subject to advocate review).

After filing and service facts are recorded:

- Track entry of appearance: 15 days from service of summons.
- Track defence: 14 days from appearance.
- Where the liquidated demand remains undefended after the applicable response period, recommend review for the Order 10 default-judgment path; do not file or request judgment automatically.

Implementation rules:

- Base calculated dates on recorded external events (demand issue, service, and appearance), not assumed dates.
- Recalculate dependent deadlines when an authorised user corrects a source date.
- Preserve completed tasks and audit changes; do not silently overwrite user-entered deadlines.
- Make task creation idempotent so repeated workflow syncs cannot create duplicates.
- Clearly distinguish system-recommended tasks from user-created tasks.

Acceptance criteria:

- Opening the example debt matter produces at least the demand-letter task instead of **No records yet**.
- Recording demand issuance creates exactly one response deadline.
- Recording service creates exactly one appearance deadline; recording appearance creates exactly one defence deadline.
- Re-running workflow automation creates no duplicate tasks.
- Default judgment is presented as an advocate-review recommendation only after the relevant recorded deadline expires.

## Related data-completeness follow-ups

The defendant's service address and supporting documents remain important intake completeness checks, but they are separate from these three automation requirements. The UI should continue to flag a missing adverse-party address and an empty evidence file without blocking initial matter creation.
