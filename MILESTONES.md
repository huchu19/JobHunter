# UK Sponsor Finder — Development Milestones

This is the **roadmap and progress tracker**. It drives implementation: every
feature change must trace back to a milestone here. See the workflow and "Definition
of Done" in [AGENTS.md](AGENTS.md).

**How to use this file**
- Pick a milestone, flip it to `🚧 In Progress`, check off its tasks as you build.
- Build to its **What / Implementation / Acceptance** spec.
- Run the per-milestone **Definition of Done** checklist before flipping to `✅`.
- Keep the **Progress dashboard** and **Summary table** in sync.

**Status legend:** ✅ Complete · 🚧 In Progress · 🔄 Planned · ⏸️ Blocked

---

## 📊 Progress dashboard

| # | Milestone | Status | Priority | Effort |
|---|-----------|--------|----------|--------|
| 1 | MVP | ✅ Complete | — | — |
| 1.5 | Application Profile & Resume Autofill | ✅ Complete | High | — |
| 1.6 | Import Listing from URL | ✅ Complete | High | — |
| 2 | Browser Extension | ✅ Complete | High | — |
| 3 | Drag-and-Drop Kanban | ✅ Complete | High | — |
| 3.5 | Full Application Tracking & Detail View | ✅ Complete | High | — |
| 3.6 | Dark Mode (System-default toggle) | ✅ Complete | Medium | — |
| 4 | Analytics & Insights | ✅ Complete | Medium | — |
| 4.5 | Flow Acceleration (bulk import, bulk status, extension save) | ✅ Complete | High | — |
| 5 | Company Research & Ratings | ✅ Complete | Medium | — |
| 6 | Smart Notifications | ✅ Complete (email ⏸️ needs key) | Low | — |
| 7 | Mobile App | 🔄 Planned | Low | 4–5d |
| 8 | User Accounts & Sync | 🔄 Planned | Medium | 2–3d |
| 9 | Visa Sponsorship Guide | ✅ Complete | Low | — |
| 10 | Advanced Search & Matching | ✅ Complete (AI/email ⏸️ need keys) | Low | — |

**Done:** 13 / 15  ·  **Next up:** Milestone 8 (User Accounts & Sync)
**Recommended order:** ~~5~~ → ~~9~~ → ~~6~~ → ~~10~~ → 8 → 7

> Per-milestone **Definition of Done** (repeated as a checklist in each section):
> [ ] meets Acceptance · [ ] `npm test` green · [ ] `npm run build` clean / 0 TS
> errors · [ ] AI paths degrade without `ANTHROPIC_API_KEY` · [ ] this file updated.

---

## ✅ Milestone 1: MVP

**Status:** ✅ Complete · Shipped May 31, 2026 · Priority: Foundation

Core job tracking with live sponsor search.

### Tasks
- [x] Sponsor Finder: live gov.uk CSV (34k London A-rated sponsors)
- [x] Job Dashboard: Kanban-style tracker (wishlist → offer)
- [x] Auto-verification: fuzzy-match company against sponsor register
- [x] API: sponsors, applications CRUD, URL parsing
- [x] Database: Prisma + SQLite (local) / PostgreSQL (prod)
- [x] Tests: 22 passing unit tests + real CSV verification
- [x] TypeScript: zero errors, fully typed
- [x] Build: clean production build

**Acceptance:** Search sponsors, add jobs, see auto sponsor-verification. ✅

---

## ✅ Milestone 1.5: Application Profile & Resume Autofill

**Status:** ✅ Complete · Shipped May 31, 2026 · Priority: High

Fill out the answers every job application asks for once, then reuse them everywhere.

### Tasks
- [x] `Profile` Prisma model (single `singleton` row)
- [x] `GET`/`PUT /api/profile`
- [x] `POST /api/profile/parse-resume` (server-side Claude, `claude-opus-4-8`,
      structured outputs)
- [x] `app/components/profile/ProfileForm.tsx` (`/profile` page)
- [x] Copy-to-clipboard on every answer
- [x] Degrades gracefully without `ANTHROPIC_API_KEY` (manual entry works)

**Future:** wire this profile into the Milestone 2 browser extension for true
on-page form autofill (Greenhouse / Lever / Workday).

**Acceptance:** Upload a resume → fields populate → save → answers persist and copy
to clipboard. ✅

---

## ✅ Milestone 1.6: Import Listing from URL

**Status:** ✅ Complete · Shipped May 31, 2026 · Priority: High

Paste a job-posting link and import the listing straight into the tracker.

### Tasks
- [x] "Import from URL" bar in the Add-job modal
- [x] Extract company, role, location, location type, job type, salary, summary
- [x] AI extraction layered over regex `<title>` fallback in
      `app/api/parse-url/route.ts`, guarded behind `ANTHROPIC_API_KEY`
- [x] Saved job runs through applications API → auto sponsor-verified

**Acceptance:** Paste a real job URL → fields prefill → save → card appears on the
board with sponsor verification applied. ✅

---

## ✅ Milestone 2: Browser Extension

**Status:** ✅ Complete · Shipped Jun 9, 2026 · Priority: High
> Built **autofill-first** (rescues the M1.5 profile, which was otherwise just a
> copy-paste page), with auto-capture alongside. Chrome MV3; the extension talks
> to the local app via a configurable dashboard URL (`http://localhost:3000`
> default) + CORS on `/api/*`.

Autofill job applications from the saved profile **and** auto-capture them to the
board from popular job boards (Manifest V3).

### What
Runs on Greenhouse, Lever, LinkedIn, Workday, Workable + a generic fallback
(floating action UI on any `/jobs/`, `/careers/`, `/apply/`-style URL). Two jobs:

- **Autofill (lead feature):** ✨ Autofill button fetches the saved profile from
  `GET /api/profile` and fills recognised form fields — name (split first/last),
  email, phone, location, LinkedIn/GitHub/portfolio/website URLs, current title,
  years experience, salary, notice period, start date, right-to-work, and a
  Yes/No sponsorship answer. Values are set via the native setter + `input`/
  `change` events so React/Vue forms register them; never clobbers existing input.
- **Auto-capture:** detects a "Submit application"-style click, extracts company +
  role from the page title (per-board parsing) with a host-based company fallback,
  and POSTs to `/api/applications` with `source: "extension"` → auto sponsor-
  verified. A "＋ Save job" button captures manually to the wishlist.

### How it works
1. User opens / applies on a supported board.
2. Content script mounts the floating Autofill / Save UI.
3. Autofill → `GET {dashboardUrl}/api/profile` → map profile → fields.
4. Submit click → parse company/role → `POST {dashboardUrl}/api/applications`
   (`source: "extension"`) → toast "✓ Saved — [Company] · [Role]".
5. Background worker records captures; popup shows recent + settings.

### Implementation
- **CORS:** `next.config.ts` `headers()` opens `/api/:path*` to cross-origin
  (extension fetches from job-board origins). `*` for now — app is local-only /
  unauthenticated until Milestone 8.
- **Pure logic in `extension/src/extract.ts`** (board detection, title parsing,
  profile→field mapping, name split, URL normalise) — DOM-free and unit-tested in
  `tests/extract.test.ts` (27 tests). `settings.ts` holds the `chrome`-coupled
  storage helpers and re-exports the pure URL helper.
- **`content.ts`** owns all DOM (badge UI, field scraping/filling, submit watcher,
  dashboard fetches); **`background.ts`** is the service worker; **`popup/`** is
  the settings + recent-captures UI.
- **Build:** `extension/build.mjs` (esbuild) bundles to `extension/dist/`, wired to
  the existing `npm run build:ext`. `extension/` excluded from the app `tsconfig`
  (it has its own + `@types/chrome`) so the Next build never sees `chrome` globals.

```
extension/
├── manifest.json          # Manifest V3 config
├── build.mjs              # esbuild bundler → dist/
├── tsconfig.json          # extension-only TS (DOM + @types/chrome)
├── src/{extract,settings,content,background,popup}.ts
├── popup/{popup.html, popup.css}
├── icons/                 # 16 / 48 / 128
└── dist/                  # Built output (npm run build:ext)
```

### Tasks
- [x] Extension structure + MV3 manifest + icons
- [x] Submit-click watcher for auto-capture (no XHR patching needed)
- [x] Site extractors: Greenhouse, Lever, LinkedIn, Workday, Workable + generic
- [x] Fallback floating action UI on application-like URLs
- [x] Popup UI: recent captures + settings (dashboard URL, enable/autofill/capture)
- [x] Unit tests for the pure extraction + mapping logic (27)
- [x] CORS on `/api/*`; verified `GET /api/profile` + `POST /api/applications`
      cross-origin against the live dev server
- [x] **Wired in the M1.5 profile for on-page autofill** (was the stretch goal —
      promoted to the lead feature)
- [ ] Final sign-off: load unpacked in Chrome, capture 3+ real applications

**Testing:** `npm test` 112 passing (27 new in `extract.test.ts` cover board
detection, per-board title parsing, profile→field mapping incl. company-name vs
applicant-name disambiguation and `last_name`/`first-name` normalisation, name
split, URL normalise, sponsorship answer). `npm run build` clean / 0 TS errors;
`npm run build:ext` clean → loadable `dist/` (manifest validated, all refs
resolve). Live-API check: profile fetch + applications POST/OPTIONS return CORS
headers; a simulated extension POST created a `source:"extension"` /
`status:"applied"` record with `appliedAt` stamped, then was cleaned up.

**Acceptance:** Extension fills application forms from the saved profile and
auto-captures applications to the board. ✅ *(In-browser 3+ live-capture sign-off
is the user's final manual check — see steps in the handoff.)*

### Definition of Done
- [x] Meets Acceptance (autofill + capture functional; live-Chrome sign-off pending)
- [x] `npm test` green (112)  - [x] `npm run build` + `npm run build:ext` clean / 0 TS errors
- [x] No AI added — extension is fully deterministic, works without `ANTHROPIC_API_KEY`
- [x] Dashboard + summary table updated

---

## ✅ Milestone 3: Drag-and-Drop Kanban

**Status:** ✅ Complete · Shipped Jun 9, 2026 · Priority: High
> Delivered as part of Milestone 3.5. `@dnd-kit/*` wired into `KanbanBoard`.

Fully interactive Kanban with smooth animations and optimistic updates.

### Tasks
- [x] Wrap `KanbanBoard` with `DndContext` / droppable columns / draggable cards
- [x] Drag card between columns → PATCH `/api/applications/[id]` status
- [x] Reorder cards within a column (client-session order)
- [x] Visual feedback: ghost card (`DragOverlay`) on drag, column highlight on hover
- [x] Optimistic update with rollback on error + failure banner
- [x] Touch-friendly for mobile (`TouchSensor` with activation delay)

**Testing:** Drag left→right and right→left across all statuses; reorder in-column;
network error rolls back; mobile touch drag works.

**Acceptance:** Drag any card to any column → instant UI update + API sync. ✅

### Definition of Done
- [x] Meets Acceptance  - [x] `npm test` green  - [x] `npm run build` clean / 0 TS errors
- [x] No AI dependency  - [x] Dashboard + summary table updated

---

## ✅ Milestone 3.5: Full Application Tracking & Detail View

**Status:** ✅ Complete · Shipped Jun 9, 2026 · Priority: High

Turn the read-mostly board into a complete tracker: capture every detail of every
application, edit it all from a click-to-open detail drawer, and follow each job's
full history on a timeline. Informed by market research on Teal / Huntr / Simplify.

### What
- **Expanded data model** — priority (1–5 stars), deadline, follow-up date,
  per-stage timestamps (`interviewAt`/`offerAt`/`rejectedAt`), rejection reason,
  recruiter contact (name + email), and a pasted job description.
- **New `Shortlisted` stage** — 6th column (Wishlist → Applied → Shortlisted →
  Interview → Offer → Rejected).
- **`Activity` timeline** — auto-logs status changes + a "created" event, and lets
  the user add interview rounds / notes / follow-ups with their own dates.
- **Detail drawer** — click any card (board or list) to open a slide-over with all
  fields editable, a single Save, the timeline, and delete.
- **Drag-and-drop board** (Milestone 3) with optimistic move + rollback banner.
- **Filter / search / sort toolbar** — text search, location/job-type/priority
  filters, verified-only, sort by updated/deadline/applied/priority.
- **List (table) view** toggle alongside the board.
- **Richer stats** — Response rate, Ghosted, Upcoming deadlines, Follow-ups due,
  in addition to Total / Applied-this-week / Interview-rate / Offers.

### Implementation
- `prisma/schema.prisma`: new `Application` scalars + `Activity` model
  (`onDelete: Cascade`); applied via `prisma db push`.
- `app/lib/`: `applicationStatus.ts` (single source of truth for stages +
  stage-timestamp mapping + transition activity), `applicationFilters.ts`,
  `applicationStats.ts`, `sponsorMatch.ts` + `sponsorCache.ts` (shared fuzzy
  match, no longer duplicated in the route). Each `lib` file has a matching test.
- API: `POST` accepts new fields + seeds a "created" activity; `PATCH` uses an
  explicit allow-list (fixes mass-assignment), auto-stamps stage timestamps,
  logs a `status_change` activity in a transaction, and re-verifies sponsor only
  when the company changes; new `GET /api/applications/[id]` (with activities) and
  `POST /api/applications/[id]/activities`.
- Components: `DashboardClient` (state owner), `ApplicationDetail`, `PriorityStars`,
  `ActivityTimeline`, `DashboardFilters`, `ApplicationList`, `SortableKanbanCard`;
  `KanbanBoard`/`KanbanCard`/`AddJobModal` updated; `StatsBar` now queries Prisma
  directly. `DashboardToolbar` removed (folded into `DashboardClient`).

### Tasks
- [x] `Application` fields + `Activity` model + DB sync
- [x] `Shortlisted` stage
- [x] `app/lib` helpers + tests (status, filters, stats, sponsorMatch)
- [x] API: allow-listed PATCH, stage timestamps, activity logging, `GET [id]`,
      activities route, conditional sponsor re-verify
- [x] Detail drawer with full editing + timeline + add-event form
- [x] Drag-and-drop board (Milestone 3) with rollback banner + touch sensors
- [x] Filter/search/sort toolbar + list-view toggle
- [x] Richer StatsBar (response rate, ghosted, deadlines, follow-ups)
- [x] `AddJobModal` new create fields

**Testing:** Verified end-to-end against the live API — create with all fields,
auto `appliedAt`, "created" activity; applied→interview auto-stamps `interviewAt`
and logs the change while preserving `appliedAt`; future-dated interview round
added; shortlisted move; company→known-sponsor re-verifies; mass-assignment of
`id`/`createdAt` rejected; timeline ordered correctly. `npm test` 64 passing
(28 new); `npm run build` clean / 0 TS errors; dashboard renders with empty
`ANTHROPIC_API_KEY`.

**Acceptance:** Every application's full detail is captured, editable from a detail
view, draggable across stages, filterable, and shown with a complete timeline. ✅

### Definition of Done
- [x] Meets Acceptance  - [x] `npm test` green (64)  - [x] `npm run build` clean / 0 TS errors
- [x] No AI dependency added (degrades without `ANTHROPIC_API_KEY`)  - [x] Dashboard + summary table updated

---

## ✅ Milestone 3.6: Dark Mode (System-default toggle)

**Status:** ✅ Complete · Shipped Jun 9, 2026 · Priority: Medium

A full dark theme with a Light / Dark / System toggle. Defaults to the OS setting
and remembers the user's explicit choice. No flash of the wrong theme on load.

### What
- **Dark palette** layered onto the existing CSS design tokens — flip the token
  values under a `.dark` root and the entire token-driven UI (sidebar, cards,
  stats, drawer, forms, kanban) shifts with zero per-component changes.
- **Theme toggle** in the sidebar cycling Light → Dark → System, each with an icon.
- **System default** — with no saved preference the theme follows
  `prefers-color-scheme` and live-updates if the OS preference changes.
- **No FOUC** — a tiny synchronous inline script in `<head>` sets the theme class
  before first paint; `<html suppressHydrationWarning>` avoids a hydration mismatch.

### Implementation
- `app/globals.css`: `@custom-variant dark` (Tailwind v4 manual dark variant) +
  a `.dark` token block (surfaces, text, brand-soft, borders, shadows) and
  `color-scheme: dark`.
- `app/lib/theme.ts`: pure helpers — `THEMES`, `resolveTheme()`,
  `getStoredTheme()` / `setStoredTheme()`, `applyTheme()`, plus the inline
  no-flash script string. Matching test in `tests/theme.test.ts`.
- `app/components/ThemeToggle.tsx`: client component, reads/writes
  `localStorage`, listens to the system media query in `System` mode.
- `app/layout.tsx`: inline pre-hydration script + `suppressHydrationWarning`.
- `app/(dashboard)/layout.tsx`: `<ThemeToggle>` mounted in the sidebar footer.

### Tasks
- [x] `@custom-variant dark` + `.dark` token overrides in `globals.css`
- [x] `app/lib/theme.ts` helpers + `tests/theme.test.ts`
- [x] Pre-hydration inline script + `suppressHydrationWarning` in root layout
- [x] `ThemeToggle` (Light/Dark/System) mounted in the sidebar
- [x] System default + live OS-preference updates

**Testing:** Toggle cycles Light→Dark→System; choice persists across reload; with
no stored choice the theme matches the OS and follows OS changes live; no flash of
light theme when loading in dark. `tests/theme.test.ts` covers resolve/storage.

**Acceptance:** A visible toggle switches the whole app between light and dark,
defaults to the system setting, and remembers an explicit choice. ✅

### Definition of Done
- [x] Meets Acceptance  - [x] `npm test` green  - [x] `npm run build` clean / 0 TS errors
- [x] No AI dependency  - [x] Dashboard + summary table updated

---

## ✅ Milestone 4: Analytics & Insights

**Status:** ✅ Complete · Shipped Jun 10, 2026 · Priority: Medium
> Charts built as lightweight inline SVG/CSS (**no Recharts/Chart.js dependency**)
> to keep the bundle lean and match the app's bespoke token-driven styling — they
> theme with light/dark for free.

Track job-search progress over time on a dedicated `/analytics` page.

### What
- **Application funnel** — Applied → Shortlisted → Interview → Offer with both
  %-of-top and %-from-previous (drop-off). Cumulative reach: an offer counts
  toward every earlier stage; a rejected-after-interview still counts toward
  Interview via its timestamp. Rejected is treated as an outcome, not a stage.
- **Applications-per-week timeline** — trailing 8 weeks, zero-filled for a
  continuous axis, as an inline SVG column chart.
- **Conversion rates** — Applied→Interview, Interview→Offer, Applied→Offer.
- **Average time between stages** — mean days Applied→Interview and
  Interview→Offer, with sample sizes; out-of-order/negative gaps ignored.
- **Pipeline snapshot** — current status distribution across all six stages as a
  stacked proportion bar + legend.

### Implementation
- `app/lib/applicationAnalytics.ts` — pure aggregations (`buildFunnel`,
  `appliedPerWeek`, `stageGaps`, `conversions`, `statusDistribution`,
  `computeAnalytics`) over the same minimal `StatApplication`-style shape, reusing
  `STATUS_META` ordering. Matching `tests/applicationAnalytics.test.ts` (14 tests).
- `GET /api/applications/stats` — selects only the needed fields, defers all maths
  to `computeAnalytics`. (Available for the extension / external use; the page
  itself reads Prisma directly like `StatsBar`.)
- `app/components/analytics/AnalyticsCharts.tsx` — presentational SVG/CSS panels.
- `app/(dashboard)/analytics/page.tsx` — server component, Suspense, empty state.
- Sidebar **Analytics** link (`BarChart3`) in `app/(dashboard)/layout.tsx`.

### Tasks
- [x] Add `interviewAt` / `offerAt` / `rejectedAt` + migration *(done in M3.5)*
- [x] Set timestamps automatically on status transitions *(done in M3.5)*
- [x] `GET /api/applications/stats` aggregations
- [x] Analytics page with funnel + timeline + conversion + stage-gap + distribution
- [x] Sidebar link

**Testing:** `npm test` 126 passing (14 new: cumulative funnel reach, rejected-
after-interview counting, pct maths, week bucketing + zero-fill + window
exclusion, stage-gap averaging incl. negative-gap rejection, conversions,
distribution ordering, empty-list safety). `npm run build` clean / 0 TS errors.
Verified against live data (81 tracked, 26 applied): `GET /stats` → 200 with a
correct Applied=26/100% funnel, n/a stage gaps (no interviews yet), and matching
status distribution; `/analytics` renders all five panels.

**Acceptance:** Analytics page shows accurate funnel, timeline, conversion rates,
and stage timings. ✅

### Definition of Done
- [x] Meets Acceptance  - [x] `npm test` green (126)  - [x] `npm run build` clean / 0 TS errors
- [x] No new dependency; no AI added (works without `ANTHROPIC_API_KEY`)
- [x] Schema unchanged (M3.5 timestamps reused)  - [x] Dashboard + summary table updated

---

## ✅ Milestone 4.5: Flow Acceleration

**Status:** ✅ Complete · Shipped Jun 11, 2026 · Priority: High

Three features that remove the biggest friction points in the job-hunting flow:
browse sponsors → find job postings → bulk-save them → batch-move to Applied.

### What
- **Bulk URL import** — "Bulk import" button on the dashboard opens a modal where
  you paste any number of job URLs (one per line). All are parsed in parallel via
  `/api/parse-url`, results shown in an editable preview table (company, role,
  location, salary all editable inline), then saved to Wishlist in one click.
  Failed or incomplete rows can be fixed before saving.
- **Bulk status update** — "Select" toggle on the dashboard enters select mode.
  Clicking a card (board) or row (list) selects it (highlighted). A sticky bar
  shows how many are selected and lets you move all of them to any stage
  (Wishlist / Applied / Shortlisted / Interview / Offer / Rejected) in one click.
  Drag-and-drop is disabled in select mode so clicks don't accidentally drag.
- **Extension: Save Job on any page** — the "＋ Save job" button previously only
  appeared on known ATS boards or `/jobs/`-like URLs. Now it appears on every
  page when capture is enabled — so you can save from any company careers page,
  not just Greenhouse/Lever/LinkedIn. Autofill is still gated to application-form
  URLs to avoid noise.

### Tasks
- [x] `BulkImportModal` component — textarea → parallel parse → editable preview → bulk POST
- [x] "Bulk import" button in `DashboardClient` toolbar
- [x] Select mode toggle + `selectedIds` state in `DashboardClient`
- [x] Checkbox rendering on `KanbanCard` + `ApplicationList` rows in select mode
- [x] Bulk action bar with per-stage move buttons
- [x] Props threaded through `KanbanBoard` → `KanbanColumn` → `SortableKanbanCard` → `KanbanCard`
- [x] Drag listeners suppressed in select mode (no accidental drags)
- [x] Extension `content.ts`: mount Save Job badge on generic sites regardless of URL path

### Definition of Done
- [x] Meets Acceptance  - [x] `npm test` green (122)  - [x] `npm run build` + `npm run build:ext` clean / 0 TS errors
- [x] No new AI dependency  - [x] Dashboard + summary table updated

---

## ✅ Milestone 5: Company Research & Ratings

**Status:** ✅ Complete · Shipped Jun 12, 2026 · Priority: Medium

Enriched company data to help prioritize applications.

### What
Company research page at `/companies/[name]` (aggregated ratings, your
application history with the company, salary intel from tracked roles,
external research links, visa timeline estimate); user ratings
(work-culture / sponsorship / responsiveness) with anonymous comments;
deterministic Skilled Worker visa timeline estimates.

### Implementation
- `prisma/schema.prisma`: `Company` (+unique name) + `Rating`
  (`onDelete: Cascade`, `@@index([companyId])`), applied via `prisma db push`.
- `app/lib/companyRatings.ts` — pure validation + aggregation
  (`isValidStars`, `isRatingCategory`, `averageRating` 1dp,
  `ratingDistribution`, `aggregateRatings`, `filterByCategory`) shared by the
  API and the panel; `app/lib/visaTimeline.ts` — static gov.uk-derived stage
  data + `estimateVisaTimeline`/`formatWeeksRange`. Matching tests for both,
  plus `glassdoorSearchUrl`/`googleSalaryUrl` added to `companyLinks`.
- `GET`/`POST /api/companies/[name]/ratings` — Company row created lazily on
  first rating; case-insensitive name lookup in JS (SQLite Prisma has no
  insensitive mode); `?category=` filter; 400s on bad stars/category.
- `app/(dashboard)/companies/[name]/page.tsx` — server component; sponsor
  badge reuses `sponsorMatch` + `sponsorCache` (falls back to the
  application-derived `sponsorVerified` flag); visa timeline panel.
- `CompanyRatingsPanel` (aggregates, distribution bars, category filter
  chips, comment list) + reusable `RatingForm` — also mounted in the
  `ApplicationDetail` drawer ("Rate {company}" + "Company research" link),
  and a "Research" link on every sponsor search row.

### Tasks
- [x] `Company` + `Rating` models + `db push` (this repo uses push, not migrate)
- [x] `/companies/[name]` route
- [x] Rating form (stars + comment) on application detail
- [x] Aggregate ratings (avg + distribution), filter by category
- [x] Visa timeline estimates

**Testing:** `npm test` 141 passing (19 new: star/category validation, 1dp
averaging, distribution bucketing incl. out-of-range rejection, category
filtering, spec scenario "3 ratings → correct avg", empty-list safety, visa
stage sanity + range summing + formatting, new link builders). Live-API check:
3 ratings POSTed → company lazily created, GET aggregate list + `?category=`
filter correct, invalid stars/category → 400, case-insensitive name lookup
works, `/companies/[name]` renders 200. Test data cleaned up after.

**Acceptance:** Company page shows aggregated ratings from real users. ✅

### Definition of Done
- [x] Meets Acceptance  - [x] `npm test` green (141)  - [x] `npm run build` clean / 0 TS errors
- [x] Schema change committed (`db push` applied)  - [x] No AI dependency (works without `ANTHROPIC_API_KEY`)
- [x] Dashboard + summary table updated

---

## ✅ Milestone 6: Smart Notifications

**Status:** ✅ Complete (email delivery ⏸️ blocked: needs `RESEND_API_KEY` +
scheduler) · Shipped Jun 12, 2026 · Priority: Low

Never miss a deadline or follow-up.

### What
Weekly email digest; follow-up reminders; deadline alerts (48h); interview prep
alert 24h before; offer celebration; browser notification on status change.

### Implementation
- `NotificationSettings` singleton model (Profile pattern) via `db push`;
  `GET`/`PUT /api/settings` with allow-listed updates +
  `emailConfigured` derived from the env.
- **Pure reminder engine** `app/lib/reminders.ts` — `computeReminders`
  (follow-up due/overdue, deadline ≤48h, interview ≤24h from `interviewAt`
  or future-dated timeline activities, offer ≤24h celebration; closed
  applications excluded; sorted by due time), `filterRemindersByPrefs`,
  `buildWeeklyDigest` (reuses `computeDashboardStats`), `renderDigestText`,
  and the pure `statusChangeNotification` copy builder. 17 tests.
- `GET /api/notifications/reminders` — due-now list, pref-filtered.
- `POST /api/notifications/run` — the daily-job entrypoint a scheduler hits:
  computes reminders, emails when enabled+configured, always returns the
  payload + `email: {attempted, sent, reason}` + a `preview` of what would
  send. `{"digest": true}` sends the weekly digest instead.
- **Email transport** `app/lib/email.ts` — env-gated no-op without
  `RESEND_API_KEY` (per the AI-layering convention: never hard-fails); with a
  key it posts to the Resend HTTP API directly (no SDK dependency).
- **Browser notifications** — `app/lib/browserNotify.ts` (DOM-only wrappers;
  message copy comes from the tested pure builder). `/settings` toggle runs
  `Notification.requestPermission()` + test-notification button;
  `DashboardClient` dispatches on stage moves (🎉 for offers) when enabled.
- `/settings` page: email prefs (digest / follow-up+deadline / interview /
  offer toggles + address), browser opt-in, and a live "Due right now"
  preview from the reminders API. Sidebar Settings link.

### Tasks
- [x] `/settings` notification preferences
- [x] Daily reminder job — `POST /api/notifications/run` endpoint
      (⏸️ blocked: actual scheduler/cron infra not provisioned; point any
      daily cron at this endpoint)
- [x] Email integration (Resend, env-gated)
      (⏸️ blocked: real delivery needs `RESEND_API_KEY` — currently a
      verified no-op that reports `sent:false` with the reason)
- [x] Browser notification opt-in + dispatch
      (in-browser permission grant + desktop alert needs a manual check)

**Testing:** `npm test` 174 passing (17 new: follow-up due/overdue/2-weeks-out
spec scenario, closed-status exclusion, 48h deadline window incl. passed
deadlines, interview ≤24h via both `interviewAt` and future activities, offer
recency, dueAt ordering, pref filtering, digest stats + text rendering, status-
change copy incl. null for dull moves). Live (Jun 12, 2026): settings
GET/PUT round-trip; overdue-follow-up app → `GET /reminders` returns it
(plus two *real* DWP deadlines from live data); `POST /run` → correct
payload with `email: {attempted: true, sent: false, reason: "RESEND_API_KEY
not configured"}`; `{"digest":true}` → rendered digest over 78 live
applications; `/settings` renders 200. Test data cleaned up.

**Acceptance:** Receive email/notification based on configured reminders.
✅ for browser notifications + the full computation/preview pipeline;
⏸️ email delivery blocked on a transport key + scheduler.

### Definition of Done
- [x] Meets Acceptance (modulo blocked email delivery, above)
- [x] `npm test` green (174)  - [x] `npm run build` clean / 0 TS errors
- [x] Secrets via env, not committed (no key invented; no-op verified)
- [x] Dashboard + summary table updated

---

## 🔄 Milestone 7: Mobile App

**Status:** 🔄 Planned · 2027 · Priority: Low · Effort: 4–5d

Native iOS + Android via Expo / React Native.

### Tasks
- [ ] Scaffold Expo project, reuse the existing API layer
- [ ] Share TypeScript types across web + mobile
- [ ] View dashboard (read-only or light edits)
- [ ] Quick-add application from home screen
- [ ] Push notifications (OneSignal or FCM)

**Testing:** iOS simulator + Android emulator manual runs; push delivery.

**Acceptance:** View dashboard and add applications on iOS/Android.

### Definition of Done
- [ ] Meets Acceptance  - [ ] Shared types compile on both targets  - [ ] Dashboard + summary table updated

---

## 🔄 Milestone 8: User Accounts & Sync

**Status:** 🔄 Planned · 2026 · Priority: Medium · Effort: 2–3d

Keep applications in sync across devices.

### Implementation
- `User` model; NextAuth.js auth.
- Migrate applications off SQLite to cloud (PostgreSQL).
- Realtime sync (WebSocket or polling).

```prisma
model User {
  id           String        @id @default(cuid())
  email        String        @unique
  passwordHash String
  applications Application[]
  createdAt    DateTime      @default(now())
}
model Application {
  // ... existing fields
  userId String
  user   User @relation(fields: [userId], references: [id])
}
```

### Tasks
- [ ] `User` model + scope `Application` by `userId` + migration
- [ ] NextAuth.js signup/login (email+password or OAuth)
- [ ] Move data to cloud DB
- [ ] Realtime/near-realtime multi-device sync
- [ ] Enforce per-user data isolation

**Testing:** Sign up → create application; sign in on another device → see it; edit
on phone → refresh web → updated.

**Acceptance:** Multi-device sync works seamlessly; users only see their own data.

### Definition of Done
- [ ] Meets Acceptance  - [ ] `npm test` green  - [ ] `npm run build` clean / 0 TS errors
- [ ] Auth/data isolation verified  - [ ] Dashboard + summary table updated

---

## ✅ Milestone 9: Visa Sponsorship Guide

**Status:** ✅ Complete · Shipped Jun 12, 2026 · Priority: Low

Help users understand the sponsorship process.

### Implementation
- **Markdown content** in `content/guides/*.md` — five guides: visa timeline,
  eligibility checklist, sponsor obligations, common mistakes, FAQ. Figures
  (salary thresholds £41,700 / £33,400, fees, IHS £1,035/yr, £1,270
  maintenance, 3w/8w decision standards) checked against the live gov.uk
  pages on Jun 12, 2026 and dated in the content with links to the always-
  current sources.
- **Dependency-free markdown renderer** — `app/lib/markdown.ts` (pure parser:
  headings, lists, blockquotes, links/bold/code + `extractLinks`) rendered by
  `app/components/guides/MarkdownContent.tsx`; same no-new-deps approach as
  the analytics charts. `app/lib/guides.ts` registry + fs loader (registered
  slugs only — no path traversal).
- **Pages:** `/guides` index (guide cards + official gov.uk source list) and
  `/guides/[slug]` (statically generated via `generateStaticParams`,
  `notFound()` on unknown slugs, "More guides" footer).
- **Links in:** sidebar "Visa Guide" nav entry; sponsor search page header;
  company research page visa panel → `/guides/visa-timeline`.

### Tasks
- [x] Static `/guides` section (Markdown-based content)
- [x] Content: visa timeline, eligibility checklist, sponsor obligations, common
      mistakes, FAQ, gov.uk/UKVI links
- [x] Link from sponsor pages (sponsor finder header + company research page)
      to relevant sections

**Testing:** `npm test` 157 passing (16 new: inline/blocks/list/quote parsing,
empty-input safety, link extraction; guide registry uniqueness, fs loading +
parse of all five guides, path-traversal rejection, internal links resolve to
registered slugs, external links restricted to https gov.uk). Live: all 6
pages render 200, unknown slug → 404, and **all 8 external gov.uk links
return 200** (curl-verified Jun 12, 2026). Content figures cross-checked
against gov.uk/skilled-worker-visa, /how-much-it-costs, /your-job, and
/uk-visa-sponsorship-employers.

**Acceptance:** Guide section accessible and helpful. ✅

### Definition of Done
- [x] Meets Acceptance  - [x] `npm test` green (157)  - [x] `npm run build` clean / 0 TS errors
- [x] Links verified (8/8 gov.uk 200)  - [x] No AI dependency  - [x] Dashboard + summary table updated

---

## ✅ Milestone 10: Advanced Search & Matching

**Status:** ✅ Complete (AI re-rank + match emails ⏸️ blocked: need
`ANTHROPIC_API_KEY` / `RESEND_API_KEY` + scheduler) · Shipped Jun 12, 2026

AI-powered sponsor matching based on the user's background. Reuses the Milestone 1.5
profile (tech stack, experience, salary range).

### Implementation
- **Deterministic scoring** `app/lib/sponsorMatcher.ts` — extracts profile
  signals (skill tokens, salary expectation via range-aware parsing, tech-
  profile detection), maps skills to `techClassifier` company-name terms via
  an affinity table (python → ai/data/labs…, devops → cloud/systems…), and
  scores every sponsor with human-readable reasons (`"robotics" in company
  name`, `python ↔ ai, data`). `topSponsorMatches` excludes already-tracked
  companies. 16 tests, incl. the spec scenario.
- **AI layer (optional)** — with `ANTHROPIC_API_KEY`, `GET /api/match` asks
  Claude to re-rank the deterministic top-25 into a top-10 with one-line
  "why" blurbs; any failure falls back to the deterministic order
  (⏸️ blocked: quality unverified without a key).
- **`/matches` page** — "Top 10 sponsors for your profile" with rank,
  reasons, Research/Jobs links, an AI-ranked badge when active, and a
  fill-your-profile empty state. Sidebar "Matches" link.
- **Salary comparison** — `compareSalary`: profile expectation vs the
  £41,700 Skilled Worker threshold vs the average lower-bound of salaries on
  tracked listings; rendered as a "Salary check" panel linking the
  eligibility guide.
- **Daily matching job** — `POST /api/match/run` diffs current matches
  against the snapshot persisted on `NotificationSettings.matchSnapshot`
  and emails "N new sponsors matched" via the M6 env-gated transport
  (⏸️ blocked: delivery needs `RESEND_API_KEY`; scheduling needs cron infra —
  point a daily cron at this endpoint).
- `fetchDetailedSponsorsFromCache` added to `sponsorCache` (full sponsor
  objects, 1h TTL) so matching reuses the ISR-cached register.
- **Fix:** restored `sponsorFilter`/`RawSponsorRow` to the live gov.uk CSV
  schema (`Town/City` / `Type & Rating` / `Route`) — the M4.5 refactor had
  switched them to non-existent columns, silently filtering the register to
  0 sponsors and breaking verification app-wide. `npm run test:fetch` →
  34,844 sponsors again.

### Tasks
- [x] Scoring function: match user skills → company tech keywords
      (reuse `app/lib/techClassifier.ts`)
- [x] "Top 10 sponsors for your profile" view
- [x] Daily matching job + "N new sponsors matched" email alerts
      (⏸️ blocked: cron infra + `RESEND_API_KEY`, as in Milestone 6)
- [x] Salary comparison for matched sponsors

**Testing:** `npm test` 193 passing (16 new: salary parsing incl. "£40–60k"
lower bound, range scaling, signal extraction from skills + prose, spec
scenario Python/£60k+ → AI-data companies outscore restaurants/plumbers,
direct name hits, top-N with exclusion, threshold comparison). Live
(Jun 12, 2026, real profile + register): `GET /api/match` → 10 relevant
software/AI/data sponsors with reasons; salary panel correctly flags a £40k
expectation as below £41,700; `POST /api/match/run` → 10 new on first run,
0 new on the second (snapshot diff), email no-op with reason; `/matches`
renders 200.

**Acceptance:** Recommendations are accurate and relevant. ✅ (deterministic
path; AI re-rank pending a key)

### Definition of Done
- [x] Meets Acceptance  - [x] `npm test` green (193)  - [x] `npm run build` clean / 0 TS errors
- [x] Degrades without `ANTHROPIC_API_KEY` (deterministic order, verified live)
- [x] Dashboard + summary table updated

---

## Effort & rationale

**Total remaining effort:** ~20–25 dev-days (excluding testing & polish).

**Recommended order:** ~~2~~ → ~~3~~ → ~~4~~ → ~~5~~ → 9 → 6 → 10 → 8 → 7
- **2 (extension)** ✅ removed the most user friction → highest impact.
- **3 (drag-drop)** ✅ shipped in M3.5.
- **4 (analytics)** ✅ funnel, weekly timeline, conversions, stage timings.
- **5 (ratings)** ✅ company research page + community ratings + visa timeline.
- **9 (guide)** ✅ markdown /guides section, gov.uk-checked content.
- **6 (notifications)** ✅ reminder engine + /settings + browser alerts
  (email delivery ⏸️ needs `RESEND_API_KEY` + a scheduler).
- **10 (AI matching)** ✅ deterministic matcher + /matches view + salary check
  (AI re-rank ⏸️ needs `ANTHROPIC_API_KEY`).
- **8 (accounts/sync)** — **next up**; unlocks mobile and real multi-device use.
- **7 (mobile)** is the longer-term investment.
