# UK Sponsor Finder

A full-stack job application tracker with integrated UK visa sponsor search. Find Skilled Worker sponsors and manage your job applications in one place.

## What It Does

**For international CS students in the UK:** This app solves the visa sponsorship problem. After graduation, you need to find employers willing to sponsor your Skilled Worker visa. This app combines:

1. **Sponsor Finder** — Search the live gov.uk Register of Licensed Sponsors (updated daily)
2. **Job Dashboard** — Kanban-style tracker to manage applications from wishlist → offer

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes
- **Database:** Prisma ORM + SQLite (local) / PostgreSQL (production)
- **Data:** Live gov.uk CSV feed (gov.uk Register of Licensed Sponsors)
- **Libraries:** Fuse.js (fuzzy search), PapaParse (CSV parsing)

## Quick Start

```bash
npm install
npx prisma db push
npm run dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

## Testing

```bash
npm test              # Unit tests (22 tests, all passing)
npm run test:fetch    # Real CSV fetch verification
npm run build         # TypeScript build
```

## Key Features

### Sponsor Finder
- **Live gov.uk data:** 141k sponsors, filtered to 34k London A-rated Skilled Worker
- **Smart filters:** Area (EC1-4, WC, N1), tech companies, fuzzy search
- **Tech classifier:** Heuristic-based (Wayve, Faculty, etc.)

### Job Dashboard
- **Kanban board:** Wishlist → Applied → Interview → Offer → Rejected
- **Metrics:** Total tracked, applied this week, interview rate, offers
- **Auto-verification:** Fuzzy-matches company against live sponsor register
- **Optimistic UI:** Instant drag/delete feedback

## API Endpoints

- `GET /api/sponsors` — Filtered sponsors (24h cache)
- `GET /api/applications` — All applications
- `POST /api/applications` — Create with auto-verification
- `PATCH /api/applications/:id` — Update status
- `DELETE /api/applications/:id` — Delete
- `GET /api/parse-url?url=...` — Extract company/role from URL

## Project Structure

```
app/
├── (dashboard)/
│   ├── layout.tsx      # Sidebar navigation
│   ├── dashboard/      # Stats + Kanban
│   └── sponsors/       # Search page
├── api/
│   ├── sponsors/       # GET filtered (ISR cache)
│   ├── applications/   # CRUD operations
│   └── parse-url/      # URL parsing
├── components/         # React components
├── lib/                # Pure functions (filter, tech classify, fetch)
├── types/              # TypeScript interfaces
└── styles/
```

## Data

**Source:** gov.uk Register of Licensed Sponsors — Workers Route

- **Raw:** 141,567 rows
- **Filtered:** ~34,760 unique London A-rated Skilled Worker sponsors
- **Updated:** Daily

**Local database:** SQLite (`prisma/dev.db`)  
**Production:** PostgreSQL (set `DATABASE_URL` env var)

## Deployment

```bash
# Vercel
vercel
# Set DATABASE_URL to PostgreSQL (Neon, Supabase, etc.)
```

---

**Built for:** CS with Management at QMUL, graduating July 2026, seeking Skilled Worker visa sponsorship.

**Demonstrates:** Full-stack Next.js, real-world data pipeline, test-driven development, TypeScript, Tailwind CSS.
