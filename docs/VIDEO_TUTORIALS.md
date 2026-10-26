# Help & Video Tutorials

## Architecture

`server/apps/tutorials` is a Django/DRF application using the existing UUID and `TimestampedModel` conventions, acceptance/password/subscription-gated JWT authentication, `UserRole`, `FirmRole`, and active `LawFirmMember` records. It does not create identities, tenants, or roles. All content is shared platform learning material. No tenant-private content is supported or accepted; only platform operators (`PLATFORM_ADMIN`) can edit it. Firm `ADMIN`, Django `is_staff`, and `is_superuser` alone do not grant publishing access.

`client/src/modules/tutorials` uses the existing Axios authentication interceptor, role workspace routes, Card and form controls. Sidebars link to Help in all workspaces. The shared workspace page header renders nonblocking contextual help for known feature identifiers. Library and management routes are lazy loaded. The YouTube SDK loads only after the learner presses **Load video**. Native player controls supply playback, sound, seeking, speed, keyboard controls and fullscreen where supported.

The player uses the official YouTube IFrame API: https://developers.google.com/youtube/iframe_api_reference. Chapter selection uses `seekTo` on the existing player. The HTML5 adapter sets `currentTime`. Neither reloads the application or proxies video bytes. No paid services or new dependencies were added.

## Schema and lifecycle

- `TutorialCategory`: editable name, unique slug, description, order, activation, audit dates.
- `Tutorial`: unique slug, title/description, protected category FK, normalized video reference, provider, HTTPS thumbnail URL, known duration (0 means unknown), complete/feature type, draft/published/archived status, featured flag, order, feature identifier, publication and audit dates.
- `TutorialChapter`: tutorial FK, title, description, start/end seconds, order, optional feature identifier. Start is unique per tutorial. Validation rejects negative, reversed, overlapping, unordered or out-of-duration chapter intervals.
- `TutorialAudience`: references the existing user-role and firm-role choices. No rows means all authenticated users. Within a row, both nonempty fields must match; rows are alternatives. Firm roles require active membership.
- `TutorialProgress`: unique `(user, tutorial)` ownership, last position, merged watched intervals, percentage, completion, audit dates. User deletion cascades progress. Only the current user's progress can be read or written. User/firm IDs in query parameters cannot override ownership.

Tutorials cannot be deleted through the API; archive instead. Category deletion is also disabled. Editing chapters/text preserves progress; replacing the provider/video resets progress deliberately. Archive, inactive category, or audience changes immediately remove content and its progress from learner queries. This shared-content design does not store client/case/firm information. A future tenant-private extension must add a firm FK and explicit tenant scopes to both content and progress before accepting any private content.

Migration: `server/apps/tutorials/migrations/0001_initial.py`.

## API

All paths below begin `/api/tutorials/`. Existing JWT authentication and platform access gates apply. List responses use `{count, next, previous, results}` with 24 records per page; category responses are arrays.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/` | Published, audience-filtered library |
| GET | `categories/` | Active categories with accessible content; platform operators see all |
| GET | `{uuid}/` | Tutorial, chapters, audiences, current user's progress |
| GET | `{uuid}/chapters/` | Ordered chapters |
| GET | `featured/` | Featured accessible tutorials |
| GET | `recommended/` | Role-accessible tutorials, featured first |
| GET | `progress/` | Recently watched tutorials, latest first |
| GET | `{uuid}/progress/` | Own progress or null |
| POST/PATCH | `{uuid}/progress/` | Save `{position, ranges: [[start,end], ...]}` |
| POST | `/` | Platform-only creation with nested chapters/audiences |
| PATCH | `{uuid}/?manage=1` | Platform-only edits/publication/archival |
| POST | `categories/` | Platform-only category creation |
| PATCH | `categories/{uuid}/` | Platform-only category edits/deactivation |

Library filters: `search`, `category` (UUID), `feature`, `page`. Search covers title, description, category name, chapter title and tutorial/chapter feature identifiers. The browser links a matching chapter with `?t=SECONDS`. `manage=1` enables draft/archived visibility only for platform operators; it cannot elevate a firm administrator.

Nested chapter input: `{title, description, start, end, display_order, feature}`; `end` may be null. Nested audiences: `{role, firm_role}`; blank fields are wildcards, but both cannot be blank. PATCH omitting chapters/audiences preserves them; providing an array replaces that collection transactionally. Chapter IDs may change on edits; deep links use seconds rather than chapter IDs.

## Publish the first complete platform guide

1. Sign in with an existing **PLATFORM_ADMIN** account. Do not give this role to a firm owner just to publish a tutorial.
2. Open **Help & Video Tutorials → Manage tutorials** (`/platform/help/manage`).
3. Expand **Manage categories**, enter `Getting Started`, slug `getting-started`, description and display order, leave Active selected, and save. Categories are data, not a fixed code list; create only categories for features present in this installation.
4. Record a complete walkthrough using fictional law firms, clients, matters, documents and finances. Edit/redact all secrets and personal information before uploading. Upload the sanitized video through YouTube Studio, enable embedding, and copy its HTTPS watch/share URL. The application links videos; it does not upload them to YouTube.
5. Select **New tutorial**, enter a title such as `Complete platform walkthrough`, slug `complete-platform-walkthrough`, description and category. Select YouTube and paste the video URL or its 11-character ID. Enter the actual duration in seconds. Select **Complete platform guide**, enable **Featured tutorial**, and optionally supply a thumbnail HTTPS URL.
6. Add chapters using the actual recorded video. Enter `MM:SS` or `HH:MM:SS`; for example `08:35` is stored as 515 seconds. Give chapters clear titles/descriptions. Optional end timestamps must precede the next chapter. Move chapters with **Move up/down**, keeping timestamps in increasing order.
7. Associate tutorial/chapter features with `dashboard`, `clients`, `cases`, `documents`, `calendar`, `billing`, `finance`, `settings`, or `employees` as appropriate. A matching chapter takes priority in contextual help. Custom identifiers are accepted by the API and reusable `ContextualHelp` component when future features are added.
8. Add audiences if necessary. For an advocates-only tutorial choose firm role `LAWYER`; for a firm-administration tutorial choose user role `ADMIN`. Leave no rows for a guide suitable for every authorized learner.
9. Save as **draft**. Click **Preview saved video**, then Load video, to review the saved source. Save changes before previewing. Review duration, chapters, confidentiality and embedding settings.
10. Set **Publication status → published** and save. Visit the Help Center as a learner in the intended role and verify each timestamp, feature link and mobile chapter panel. Use draft to unpublish, archived to retire, or deactivate a category to hide its tutorials.

No demonstration videos, categories or example chapters are automatically seeded. A real recording must be supplied by the operator.

## Progress and privacy

Resume is an explicit choice; playback does not automatically start on page entry. A saved position is offered as **Resume from MM:SS**. Chapters update the active highlight during playback and scroll the active item into view. The chapter panel is collapsible on mobile and desktop.

The player samples locally once per second but saves at 15-second checkpoints, pause/end, visibility changes, and component cleanup. Continuous playback contributes intervals; explicit chapter seeks and HTML5 seek events reset the activity sample, so jumps are not credited. Pause/end events sample the exact final playback position before saving. HTML5 deep-link seeking waits for video metadata to load. The server merges overlapping intervals rather than double-counting rewatches, validates interval size and known duration, and limits reported activity against server elapsed time. Completion requires at least 90% unique interval coverage of a configured duration. Unknown-duration tutorials never claim completion. This is a learning convenience, not an exam/proof-of-attendance system; browser-reported events are not tamper-proof. A hard browser/process exit may lose the final checkpoint because authenticated asynchronous requests are not guaranteed during tab termination.

The progress transaction locks the authenticated identity row before creating/updating its unique progress record. Progress never accepts a client-supplied user or firm owner. Since content is platform-wide, progress belongs to the identity, not to a firm-private record. No external analytics are sent. Account deletion deletes progress; otherwise progress persists until the video source changes or an operator applies their documented retention policy. YouTube receives browser requests after Load video; do not use confidential videos, including unlisted videos.

## Deployment and video sources

Run with the normal configured database:

```sh
cd server
venv/bin/python manage.py migrate
venv/bin/python manage.py check
cd ../client
npm run build
```

YouTube needs no API key or new environment variable. HTML5 is disabled by default. To approve direct sources, set `TUTORIAL_VIDEO_HOSTS=media.example.org,training.example.org` in the backend environment and restart. Only exact HTTPS hosts are accepted, without credentials or explicit ports. Configure video CDN range requests and suitable content types. Approved static video URLs are not access control; any future confidential provider must issue user-scoped, short-lived playback credentials after authorization. Never store large video files in the Django container. Thumbnails are externally hosted HTTPS images loaded lazily with no referrer; choose an operator-controlled host.

The frontend document includes a restrictive `frame-src` CSP allowing self and the two approved YouTube embed origins, plus `base-uri 'self'`. If hosting already supplies a stricter CSP, merge the following sources into that policy rather than replacing it:

- `script-src`: existing app sources plus `https://www.youtube.com` (IFrame API and player scripts).
- `frame-src`: `'self' https://www.youtube-nocookie.com https://www.youtube.com`.
- `img-src`: existing app sources and approved HTTPS thumbnail origins.
- `media-src`: exact approved HTML5 CDN origins.

The API's CSP cannot protect a separately hosted SPA document; configure HTTP headers at the frontend host. Preserve existing API, WebSocket, font and payment policies. Never add arbitrary iframe HTML. React renders descriptions as text.

## Troubleshooting

- **No tutorials:** check publication, category activation and audience/active firm membership. The empty library is expected before the first publication.
- **404:** the video may be a draft, archived or outside the viewer's audience. Platform edits use `?manage=1`.
- **Player timeout/error:** check connectivity, content blockers, CSP, video removal, regional restrictions and YouTube embedding permission. Native player speed/fullscreen availability depends on provider/browser. Reload the page to retry a failed SDK load.
- **YouTube error 153:** preserve the document origin/referrer. Do not deploy a global no-referrer policy for embeds. The app supplies origin and sets the iframe's referrer policy.
- **Invalid chapters:** use increasing start times and display order, valid seconds, ends after starts, and timestamps below/equal to duration as applicable. A chapter cannot start at the exact end of the video.
- **No completion:** enter a known duration and watch the material; merely seeking does not count. Progress saving failures are shown without stopping playback.
- **HTML5 error:** approve the exact host, check HTTPS certificate, codec/content type, signed URL expiry, range requests and CSP.

## Future assistant/provider integration

`recommend_tutorials(user=authenticated_user, query='client registration')` in `apps/tutorials/services.py` returns authorized published tutorial IDs, chapter titles, seconds and relative deep links, using only database text search. A caller must supply the existing authenticated identity and prepend the correct workspace path. The current assistant is unchanged; no case facts or confidential messages need to go to a third party. The same REST search API can be called from the UI assistant. Do not hand an unfiltered management queryset to an assistant.

For a new provider: add a model choice/migration, strict backend reference normalization, an explicit frontend adapter for seek/current-time/state/error and teardown events, hosting CSP entries and provider-focused tests. Unsupported events must disable completion rather than fabricate it. For confidential hosting add per-user playback authorization and expiration before enabling it.

## Verification and limits

Run backend tests with `venv/bin/python manage.py test apps.tutorials --settings=config.settings_test --noinput`. Frontend tests run with `npm test -- --run`; build with `npm run build`. There is no TypeScript/type-check script in this JavaScript project. Player tests use a mocked official IFrame API and test native HTML5 error paths. They do not prove a real third-party video is playable in all browsers, regions or content-blocker configurations. Responsive behavior uses the existing Tailwind breakpoints; manual device/browser playback and a real-recording editorial review remain deployment acceptance steps.

## Changed-file inventory

New backend files:

```text
server/apps/tutorials/__init__.py
server/apps/tutorials/access.py
server/apps/tutorials/models.py
server/apps/tutorials/serializers.py
server/apps/tutorials/services.py
server/apps/tutorials/views.py
server/apps/tutorials/urls.py
server/apps/tutorials/migrations/__init__.py
server/apps/tutorials/migrations/0001_initial.py
server/apps/tutorials/tests/__init__.py
server/apps/tutorials/tests/test_tutorials.py
```

New frontend files:

```text
client/src/modules/tutorials/api.js
client/src/modules/tutorials/HelpCenter.jsx
client/src/modules/tutorials/VideoPlayer.jsx
client/src/modules/tutorials/TutorialAdmin.jsx
client/src/modules/tutorials/ContextualHelp.jsx
client/src/modules/tutorials/HelpNavigation.jsx
client/src/modules/tutorials/tutorials.test.jsx
```

Modified integration/configuration files:

```text
.env.example
.gitignore
README.md
server/.env.example
server/config/settings.py
server/config/urls.py
client/index.html
client/src/routes/index.jsx
client/src/components/navigation/PageBackBar.jsx
client/src/layouts/admin/AdminSidebar.jsx
client/src/layouts/client/ClientSidebar.jsx
client/src/layouts/portal/ClientSidebar.jsx
client/src/layouts/staff/common/StaffSidebar.jsx
client/src/layouts/staff/lawyer/LawyerSidebar.jsx
client/src/layouts/staff/secretary/SecretarySidebar.jsx
```

This guide (`docs/VIDEO_TUTORIALS.md`) is new. The gitignore exception ensures it is included despite the repository's general exclusion of docs.

## Implementation verification (23 October 2026)

- Backend: all 10 tutorial tests passed using the existing Django test settings and complete project migrations. This includes cross-firm users, inactive memberships, progress ownership, publication permissions, chapter validation, invalid sources, restricted search/recommendations, interval merging/completion and preserving/resetting progress on edits.
- Frontend: all 220 tests across 52 files passed with `npx vitest run --maxWorkers=2`, including 14 tutorial tests. The initial unconstrained run hit two timeout failures in existing conflict-check tests; that file passed alone and the complete suite passed with two workers.
- `npm run lint`: zero errors; eight existing hook dependency warnings outside the tutorial module. Targeted tutorial lint passed without warnings.
- `npm run build`: passed.
- `manage.py check`: no errors; existing warning that `server/static` does not exist.
- Migration drift check: no changes detected. `tutorials.0001_initial` was applied to both the configured PostgreSQL database and SQLite through test settings.
- `git diff --check`: passed.
- A real browser/YouTube end-to-end run and manual mobile-device playback were not executed; no browser automation harness is installed. The IFrame API is mocked in automated player tests. No TypeScript checking was run because this is a JavaScript project without a type-check command.
- No deployment was performed, no secrets were changed, and no videos or sample chapters were published.

Follow-up review: exact HTML5 pause/end positions are sampled before saving, explicit seeks reset playback activity, and HTML5 timestamp seeking waits for metadata. Two additional player regressions pass; the complete frontend suite now contains 220 passing tests. Backend tests remain 10 passing tests.
