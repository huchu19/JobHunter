<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all
differ from your training data. Read the relevant guide in
`node_modules/next/dist/docs/` before writing any Next.js code. Heed deprecation
notices.
<!-- END:nextjs-agent-rules -->

# UK Sponsor Finder — Agent Operating Manual

This is the single source of truth for how to work in this repo. Read it before
making changes. The roadmap and progress tracker live in [MILESTONES.md](MILESTONES.md);
**every feature change must trace back to a milestone there** (see "Workflow" below).

## What this project is

A job-application tracker for people who need a UK Skilled Worker visa. It pairs a
live search over the gov.uk sponsor register with a Kanban board that auto-verifies
whether each company you apply to can actually sponsor you. Plus a reusable
application profile (resume autofill) and one-paste job import.

## Tech stack

- **Next.js** (App Router) — see the Next.js rule above; read the bundled docs.
- **React** + **TypeScript** (strict, zero errors expected).
- **Prisma** ORM → SQLite locally (`prisma/prisma/dev.db`), PostgreSQL in prod.
- **Tailwind CSS** (v4, via `@tailwindcss/postcss`).
- **Anthropic SDK** (`@anthropic-ai/sdk`, model `claude-opus-4-8`) for resume
  parsing and URL/job extraction. All AI is **server-side only** and **optional** —
  every AI path degrades gracefully when `ANTHROPIC_API_KEY` is absent.
- **fuse.js** — fuzzy company↔sponsor matching. **papaparse** — gov.uk CSV.
- **@dnd-kit** — drag-and-drop (installed; wired in Milestone 3).
- **@tanstack/react-virtual** — virtualized long sponsor lists.
- **Vitest** — unit tests.

## Project map

```
app/
  page.tsx, layout.tsx, globals.css   # root shell
  (dashboard)/                         # main app, grouped route
    dashboard/   sponsors/   profile/  # the three pages
  api/                                 # route handlers (server)
    applications/  [id]/               # CRUD + status updates
    sponsors/                          # sponsor search
    profile/  parse-resume/            # profile GET/PUT + resume AI parse
    parse-url/                         # import-from-URL AI extraction
  components/
    dashboard/   # KanbanBoard, KanbanCard, AddJobModal, StatsBar, DashboardToolbar
    sponsors/    # SponsorSearch
    profile/     # ProfileForm
  lib/           # csvFetcher, sponsorFilter, techClassifier, anthropic,
                 # companyLinks, londonAreas, db (Prisma client)
  types/         # sponsor, application, profile
prisma/schema.prisma                   # Application, Profile models
tests/                                 # Vitest unit tests (mirror app/lib)
scripts/testFetch.ts                   # manual gov.uk CSV fetch check
extension/                             # browser extension (Milestone 2, not built yet)
```

## Commands

```bash
npm run dev          # local dev server
npm run build        # production build — must pass clean before any milestone is "done"
npm test             # vitest run — must pass before any milestone is "done"
npm run test:ui      # vitest watch UI
npm run test:fetch   # sanity-check the live gov.uk CSV fetch
npm run build:ext    # build the browser extension (once Milestone 2 exists)
npx prisma migrate dev --name <name>   # after editing schema.prisma
npx prisma studio    # inspect the local DB
```

## Conventions (match the existing code)

- **AI is layered, never required.** Pattern: deterministic fallback first (regex,
  manual entry), AI enhancement on top, guarded behind `ANTHROPIC_API_KEY`. A route
  must never hard-fail because the key is missing. Follow `app/api/parse-url/route.ts`.
- **Server-side AI only.** The Anthropic key never reaches the client.
- **Sponsor verification** runs through the applications API on save — don't
  re-implement matching in the UI; reuse `app/lib/sponsorFilter.ts` / fuzzy match.
- **Types live in `app/types/`** and are shared between API and components.
- **New `app/lib/` logic gets a matching test in `tests/`.**
- Keep TypeScript strict-clean and the production build green.

## Definition of Done (every milestone)

A milestone is only `✅ Complete` when **all** of these hold — check them off in
MILESTONES.md:

1. Feature works against the stated **Acceptance** criteria.
2. `npm test` passes (new `lib` logic has tests).
3. `npm run build` is clean; zero TypeScript errors.
4. AI paths (if any) degrade gracefully without `ANTHROPIC_API_KEY`.
5. MILESTONES.md updated: status flipped, checkboxes ticked, date set.

## Workflow — how to use these docs to implement

When asked to build or change something:

1. **Find the milestone** in [MILESTONES.md](MILESTONES.md) it belongs to. If none
   fits, add a new milestone entry there first (status `🔄 Planned`), then build.
2. Flip that milestone to `🚧 In Progress` and check off its task list as you go.
3. Build to the milestone's **What / Implementation / Acceptance** spec.
4. Run the **Definition of Done** checklist above.
5. Flip to `✅ Complete`, set the date, update the summary table at the bottom of
   MILESTONES.md.

This keeps the roadmap and the codebase in lockstep, so progress is always visible
in one place.
