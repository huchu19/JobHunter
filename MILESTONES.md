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
| 10.5 | Careers Resolution & In-App Listings | ✅ Complete (AI via `GEMINI_API_KEY`) | High | — |
| 10.6 | Live Roles Feed & Save-to-Board | ✅ Complete | High | — |
| 10.7 | Role-Based Matching (employers ranked by live roles) | ✅ Complete | High | — |
| 11 | Visual Redesign — "Functional" theme (Linear-style) | ✅ Complete | Medium | — |

**Done:** 17 / 19  ·  **Next up:** Milestone 8 (User Accounts & Sync)
**Recommended order:** ~~5~~ → ~~9~~ → ~~6~~ → ~~10~~ → ~~10.5~~ → ~~10.6~~ → ~~10.7~~ → 8 → 7

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

## ✅ Milestone 10.5: Careers Resolution & In-App Listings

**Status:** ✅ Complete (AI web-search layer ⏸️ blocked: needs `GEMINI_API_KEY`)
· Shipped Jun 17, 2026 · Priority: High

Turn the "Careers" button from a Google search into a one-click jump to the
company's **real** careers page — and show its **open roles in-app**. The gov.uk
register only gives a registered legal name (no website column), so we resolve
the actual careers/ATS URL once and cache it.

### What
- **Careers resolution** — a registered sponsor name (e.g. "MONZO BANK LIMITED")
  → its real careers/ATS URL, via a deterministic domain probe (clean the legal
  name → guess `monzo.com`/`.co.uk`/`.io`/`.ai` → probe which resolves → look for
  `/careers`/`/jobs` and detect Greenhouse/Lever/Ashby/Workday/SmartRecruiters),
  enriched by an **AI web search** (Google **Gemini** with Google-Search
  grounding) for brand≠legal cases the guesser misses (e.g. ByteDance → TikTok).
  Results — positive **and** negative — are persisted so each company resolves
  once.
- **In-app listings** — when an ATS is identified, the open roles are pulled from
  that ATS's **public JSON API** (no keys, no scraping) and shown inline:
  Greenhouse (`boards-api.greenhouse.io`), Lever (`api.lever.co`), Ashby, and
  Workday (CXS endpoint, shared with the URL-import Workday logic). Unknown ATS →
  a "View careers site" link fallback (resolved URL, else a Google search).
- **UI** — `/matches` rows get a "View roles" toggle that expands a live-roles
  panel; the sponsor Browse "Careers" button now opens the **resolved** site; the
  company research page gains an "Open roles" panel + an "Official careers page"
  link.

### Implementation
- `prisma/schema.prisma`: `CompanyCareers` model (`@unique` name, careers/homepage
  URLs, `atsType`/`atsToken`, `confidence`, `status` incl. cached `"unresolved"`),
  applied via `prisma db push` (this repo uses push, not migrate).
- **Pure, unit-tested libs:**
  - `app/lib/careersResolver.ts` — `brandSlug`, `candidateDomains`, `detectAts`,
    and the deterministic↔AI `mergeResolution` (AI overrides only when present,
    never clobbers a resolved guess — same rule as `parse-url`); plus the
    network `probeCandidates`.
  - **ATS-discovery upgrade (Jun 17):** `probeCandidates` now tries a
    **verified ATS-board probe first** — `probeAtsBoards`/`atsTokenCandidates`
    probe Greenhouse/Lever/Ashby boards for the brand slug and keep the first
    that *actually returns open roles* (`countAtsJobs`), so the common
    name=board-token case (Monzo→greenhouse/monzo, Deliveroo→ashby/deliveroo,
    Cleo→greenhouse/cleo) resolves to a **live feed with zero AI cost** and the
    Gemini call is skipped entirely. The sharpened Gemini prompt targets the ATS
    board token, and any AI-supplied token is **verified** before trust — an
    empty/404 board strips the ATS fields so the UI never shows a dead "live
    roles" feed (Wise→custom ATS correctly falls back to a link). Injectable
    verifier keeps it all unit-testable without live HTTP.
  - `app/lib/atsListings.ts` — per-ATS endpoint builders + response normalisers
    into a shared `Listing` shape, and a `fetchListings` dispatcher. Workday's
    CXS transform lives here (shared with `parse-url`).
- `app/lib/resolveCareers.ts` — server orchestration (DB cache → probe → AI web
  search → persist) shared by both routes; AI guarded by `geminiGenerateUrl()`
  (`app/lib/gemini.ts`), calls the **Gemini** `generateContent` REST endpoint
  with the `google_search` grounding tool via plain `fetch` (no SDK — same style
  as `email.ts`/Resend), extracts the JSON answer leniently (`gemini-2.5-flash`
  default, `GEMINI_MODEL`-overridable), falls back to the guess on any failure —
  never hard-fails on a missing key. **Provider-isolated:** only `aiResolve()`
  knows about Gemini; `mergeResolution`, the cache, routes, and UI are
  provider-agnostic, so swapping providers touches one function.
- API: `GET /api/companies/[name]/careers` (resolution + `?refresh=1`) and
  `GET /api/companies/[name]/listings` (resolution → live roles + fallback link).
- Components: `app/components/companies/CareersListings.tsx` (fetch-on-mount
  panel, used inline in Matches and on the research page); `MatchesClient`,
  `SponsorSearch`, and the company research page wired in. `companyLinks`
  (`googleCareersUrl`/`linkedInJobsUrl`) kept as the always-available fallback.

### Tasks
- [x] `CompanyCareers` model + `db push`
- [x] Deterministic resolver (name clean → candidate domains → probe → ATS detect)
- [x] AI web-search resolution layer (Gemini + Google-Search grounding, lenient
      JSON extraction, graceful fallback) — ⏸️ live AI quality unverified (no
      `GEMINI_API_KEY` in env yet)
- [x] Public-ATS listings fetch + normalise (Greenhouse/Lever/Ashby/Workday)
- [x] `/careers` + `/listings` routes with DB caching
- [x] `CareersListings` panel; wire Matches + sponsor Browse + research page

**Testing:** `npm test` 224 passing (31 new: name normalisation → candidate
domains, ATS detection across providers, deterministic↔AI merge incl. "never
clobber a resolved guess" + unresolved marking; ATS endpoint builders + JSON
normalisers incl. empty/malformed safety; **ATS-board slug probing** with an
injected verifier — token candidates, board-URL builders, first-with-roles
selection, and `probeCandidates` short-circuiting to a verified board before any
homepage probe). `npm run build` clean / 0 TS errors.
Live (Jun 17, 2026, **no `GEMINI_API_KEY` in env** so the deterministic path ran;
re-verified after the Gemini port — key-absent cleanly skips the API call, no
errors, same deterministic result):
`GET /companies/Monzo/careers` → `monzo.com/careers`, `confidence:"high"`,
`status:"ok"`, `aiAssisted:false`, persisted then served from cache on the next
call; Deliveroo + Starling likewise resolved by the guesser; with a seeded
Greenhouse token, `GET /companies/Monzo/listings` returned 12 normalised live
roles (`fromAts:true`) with working deep links; unknown-ATS → careers-link
fallback (`fromAts:false`, no 500). Schema-change dev-server restart applied
(stale Prisma client had thrown `companyCareers.findMany`). Test data cleaned up.

**Acceptance:** The Careers button reaches the company's real careers page, and
open roles are viewable in-app where the ATS exposes them. ✅ (deterministic +
ATS-listings paths verified live; AI web-search resolution of hard brand≠legal
cases pending a `GEMINI_API_KEY`).

### Definition of Done
- [x] Meets Acceptance (modulo blocked AI web search, above)
- [x] `npm test` green (224)  - [x] `npm run build` clean / 0 TS errors
- [x] Degrades without `GEMINI_API_KEY` (deterministic probe + ATS listings,
      verified live)  - [x] Schema change applied (`db push`)
- [x] Dashboard + summary table updated

---

## ✅ Milestone 10.6: Live Roles Feed & Save-to-Board

**Status:** ✅ Complete · Shipped Jun 17, 2026 · Priority: High

A dedicated **/roles** page that aggregates live open roles from UK
visa-sponsoring companies into one searchable feed, with one-click **Save to
board**. Built because the profile matcher surfaces name-keyword matches (tiny
"X Software Technologies Ltd" consultancies) that have no public job feed — so
"View roles" on /matches usually had nothing to show. This page draws from
companies that *do* have feeds, so there are always real, applyable roles.

### What
- **/roles page** — live openings pulled straight from sponsor careers boards,
  searchable (role / company / location) with per-company filter chips, each role
  deep-linking to the posting and a **Save** button that drops it into the
  Wishlist. Tracked companies are flagged and sorted first.
- **Curated pool** — `app/lib/rolesPool.ts`: 30 UK visa-sponsoring scale-ups with
  **verified public ATS boards** (Greenhouse/Lever/Ashby — tokens confirmed live
  to return roles: Monzo, Deliveroo, Cloudflare, GraphCore, Tide, Palantir,
  Octopus Energy, Synthesia, Lendable, …). These fetch straight from the ATS JSON
  APIs — no domain probe, no Gemini, no latency.
- **Tracked companies merged in** — the user's own board companies are resolved
  (cached) and any with a usable ATS feed are folded into the feed alongside the
  pool, deduped by ATS board.

### Implementation
- `app/lib/rolesFeed.ts` — pure, unit-tested aggregation: `mapPool` (bounded
  concurrency), `buildSources` (pool + tracked dedupe), `assembleFeed` (tag roles
  with company, tracked-first sort, per-company cap). 9 tests.
- `app/lib/atsListings.ts` — reused `fetchListings`; `countAtsJobs` (from M10.5)
  underpins the pool verification.
- `GET /api/roles/feed` — fetches the pool + resolved tracked companies with
  bounded concurrency, assembles, and caches the result in-memory (5-min TTL) so
  repeat visits are instant (`?refresh=1` to force). Never 500s (empty feed on
  error).
- `app/(dashboard)/roles/page.tsx` + `app/components/roles/RolesFeed.tsx` (search,
  filter chips, **Save to board** → `POST /api/applications` with
  `source: "roles-feed"`). Sidebar **Live Roles** link (`Briefcase`).
- `app/types/careers.ts` — `FeedRole` / `RolesFeedResult`.

### Tasks
- [x] Verified curated ATS-board pool (`rolesPool.ts`)
- [x] Aggregation lib (`rolesFeed.ts`) + tests
- [x] `GET /api/roles/feed` (pool + tracked, bounded concurrency, cached)
- [x] `/roles` page + `RolesFeed` (search / filter / save-to-board)
- [x] Sidebar link

**Testing:** `npm test` 233 passing (9 new: `mapPool` ordering + concurrency cap +
empty; `buildSources` pool-only / tracked-overlap-dedupe / tracked-new;
`assembleFeed` tagging + tracked-first sort + per-company cap + empty safety; pool
integrity — no dup boards, known ATS types only). `npm run build` clean / 0 TS
errors. Live (Jun 17, 2026): `GET /api/roles/feed` → **225 live roles across 31
companies** (curated pool + two tracked companies, "mthree"/"Marshall Wace",
merged with the `tracked` flag); 2nd call served from cache in 7ms; **Save to
board** POSTed a GraphCore role → Wishlist application created with
`source:"roles-feed"`; test row cleaned up.

**Acceptance:** A roles page shows real open roles from sponsoring companies, is
searchable/filterable, and saves roles straight to the tracker. ✅

### Definition of Done
- [x] Meets Acceptance  - [x] `npm test` green (233)  - [x] `npm run build` clean / 0 TS errors
- [x] No new dependency  - [x] No schema change (reuses Application + CompanyCareers)
- [x] Dashboard + summary table updated

---

## ✅ Milestone 10.7: Role-Based Matching

**Status:** ✅ Complete · Shipped Jun 17, 2026 · Priority: High

Reworked **Matches** from "score 35k sponsor *names*" (which surfaced tiny
"X Software Technologies Ltd" consultancies with no jobs) to "rank the **real
open roles** you can apply to, grouped into best-fit employers." This makes the
page genuinely useful and ties it to the M10.6 roles feed.

### What
- **Matches = best-fit employers hiring now** — employers ranked by the strength
  and count of their currently-open roles that match your profile, each
  expandable to its matching roles (title + location + reasons), every role with
  a one-click **Save**. Tracked companies surface first.
- **Roles, not names** — a role *title* ("Machine Learning Engineer") is a far
  stronger signal than a company name; scoring rewards specific multi-word skill
  hits in the title, generic tech-role fit, early-career cues, and London/UK
  location.
- **On-demand expansion** — roles come from the M10.6 feed (curated pool +
  tracked companies); if that yields fewer than 6 strong-fit employers, the route
  resolves extra profile-shortlisted sponsors (via the cached resolver) and pulls
  their roles too.

### Implementation
- `app/lib/roleMatcher.ts` (pure, tested) — `scoreRole` (specificity-weighted
  title-keyword hits + tech-role + early-career + location), `scoreRoles`
  (filter + best-first), `rankEmployers` (sum role scores per company,
  tracked-first sort, per-employer role cap). Reuses `ProfileSignals` from
  `sponsorMatcher`.
- `app/lib/gatherRoles.ts` — shared server gathering pulled out of the feed
  route: `baseSources` (pool + tracked), `resolveSources` (resolve names → ATS
  feed sources), `fetchRolesForSources`. Used by both `/api/roles/feed` and
  `/api/match`.
- `GET /api/match` rewritten — returns `{employers, salary, profileReady,
  expanded}`; deterministic, no AI/Anthropic dependency (role scoring is concrete
  enough). `POST /api/match/run` (digest) untouched — it kept its own sponsor
  logic.
- `MatchesClient` rewritten — expandable employer cards + per-role Save
  (`source:"matches"`); keeps the salary-check panel; empty state links to
  `/profile` and `/roles`.

### Tasks
- [x] `roleMatcher.ts` (score roles → rank employers) + tests
- [x] Shared `gatherRoles.ts`; refactor feed route to use it
- [x] Rework `/api/match` to role-based employers + on-demand expansion
- [x] Rework `MatchesClient` (expandable employers + save)

**Testing:** `npm test` 243 passing (10 new: title keyword-hit weighting incl.
multi-word > broad-word, generic tech-role credit, early-career + location
signals, non-tech ~0; `scoreRoles` filter/sort; `rankEmployers` per-company
summing, tracked-first tie-break, role cap + employer limit, empty safety).
`npm run build` clean / 0 TS errors. Live (Jun 17, 2026, real profile): `GET
/api/match` → 10 employers ranked by live roles — GraphCore (AI Research/
Performance Engineer, tracked), mthree (C++ grad, tracked), GoCardless/Lendable/
Marshmallow (Data Scientist/Analyst roles) — each with matching roles + reasons,
`expanded:false` (feed alone sufficed); Save from a match created a Wishlist
application with `source:"matches"`. (Compare the old output: ATEZ/Aybola/
Datazone consultancies with no roles.)

**Acceptance:** Matches ranks employers by the real roles you can apply to, not
company-name keywords. ✅

### Definition of Done
- [x] Meets Acceptance  - [x] `npm test` green (243)  - [x] `npm run build` clean / 0 TS errors
- [x] No new dependency; deterministic (no AI key needed)  - [x] No schema change
- [x] Dashboard + summary table updated

---

## ✅ Milestone 11: Visual Redesign — "Functional" theme (Linear-style)

**Status:** ✅ Complete · Shipped Jun 18, 2026 · Priority: Medium

The old theme (Geist font + teal-on-mint "modern SaaS" palette + gradient-on-
everything) read as generic AI-template output. Replaced it with an intentional
system that fits the product: a **utility, not a magazine**. Direction:
**Functional** (Linear / Vercel / gov.uk-register) — neutral grey surfaces, a
clean humanist grotesque throughout (no serif), a single **indigo** accent
reserved for intent (CTAs, active nav, links, focus, the LIVE pulse), tabular mono
for figures, flat decoration (no gradients/glows).

> Note: an earlier pass tried "Refined Dark Slate" (serif + amber/gold); it read
> too preppy/editorial for a service tool, so the accent moved to indigo and the
> serif was dropped. Same two-file, token-driven change.

### Navigation & IA pass (same milestone)
The redesign also fixed the dashboard's "scrolling forever" problem and unified
page chrome:
- **Board-first dashboard:** killed the tall marketing hero; the page is now a
  fixed-height shell (compact header + slim metric strip + filters fixed) with the
  Kanban filling the remaining viewport and owning its own scroll — no more
  double-scroll. `StatsBar` went from 8 big tiles to a one-row mono metric strip.
- **Kanban columns:** full-height with sticky count headers, **collapse-to-rail**
  per column (still a drop target), and a **jump-to-bottom / back-to-top**
  affordance that appears only when a column overflows.
- **Shared `PageHeader`:** Dashboard / Find Sponsors / Matches / Live Roles all use
  one compact header (title + one-line subtitle + optional actions), replacing the
  oversized eyebrow+two-tone-headline+blurb heroes.
- **Landing page:** `/` was the Next.js starter placeholder; replaced with a real
  marketing landing (hero + faux-board preview, feature grid, how-it-works, CTA,
  gov.uk-credited footer) in the Functional theme. No sidebar (it's outside the
  `(dashboard)` group).

### What
- Kill the two biggest "slop" tells: the **Geist** font and the **teal/mint**
  palette. Replace with characterful typography and a committed dark-first palette.
- Keep the token architecture — the whole UI keys off CSS variables in
  `globals.css`, so the swap flips every page with near-zero per-component churn.

### Implementation
- **Fonts** (`app/layout.tsx`): `Fraunces` (display serif) + `Hanken Grotesk`
  (body/UI) + `JetBrains Mono` (figures), self-hosted via `next/font/google`.
- **Palette** (`app/globals.css`): dark-first slate surfaces (`#0f1115` base),
  warm ink (`#e8e4d9`), single amber accent (`#d4a017` / hover `#e8b730` /
  soft `#4a3a12`); a light variant on the same tokens. State colors retuned to sit
  on slate.
- **Decoration:** retire the default gradients. `.text-gradient-brand` becomes a
  restrained amber two-tone (used once, on the hero), `.btn-brand` becomes a solid
  amber with dark ink text, `.panel-ink` becomes a true slate panel with a subtle
  grain/vignette instead of a teal radial.
- **Fix hardcoded leftovers:** the 1 inline teal shadow in
  `app/(dashboard)/layout.tsx` (London/contract badge chips stay — they're
  semantic category colors, not brand).

### Acceptance
- No `Geist` import remains; no teal/mint brand hex remains in `globals.css`.
- App flips entirely (light + dark) off the new tokens; both themes legible.
- `npm test` green; `npm run build` clean / 0 TS errors.

### Definition of Done
- [x] Meets Acceptance  - [x] `npm test` green (243)  - [x] `npm run build` clean / 0 TS
- [x] No AI path affected (pure CSS/typography)  - [x] No schema change
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
- **10.5 (careers resolution)** ✅ real careers-page resolver + in-app ATS
  listings on /matches, Browse, and research pages; AI layer uses **Gemini** +
  Google-Search grounding (⏸️ needs `GEMINI_API_KEY` — free tier).
- **8 (accounts/sync)** — **next up**; unlocks mobile and real multi-device use.
- **7 (mobile)** is the longer-term investment.
