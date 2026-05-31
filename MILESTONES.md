# UK Sponsor Finder — Development Milestones

## ✅ Milestone 1: MVP (COMPLETE)

**Status:** Shipped · May 31, 2026

Core job tracking with live sponsor search.

### Deliverables
- [x] Sponsor Finder: Live gov.uk CSV (34k London A-rated sponsors)
- [x] Job Dashboard: Kanban-style tracker (wishlist → offer)
- [x] Auto-verification: Fuzzy-match company against sponsor register
- [x] API: Sponsors, applications CRUD, URL parsing
- [x] Database: Prisma + SQLite (local) / PostgreSQL (prod)
- [x] Tests: 22 passing unit tests + real CSV verification
- [x] TypeScript: Zero errors, fully typed
- [x] Build: Clean production build

### Quality
- All tests passing
- Real gov.uk data verified
- Production-ready caching (ISR)
- Error handling + graceful degradation

---

## ✅ Milestone 1.5: Application Profile & Resume Autofill

**Status:** Shipped · May 31, 2026
**Priority:** High

### Reusable Application Profile

Fill out the answers every job application asks for once, then reuse them everywhere.

**What:**
- A single **Application Profile** (`/profile`) storing contact details, work
  authorization / sponsorship, notice period, salary expectation, education,
  work history, and free-text blocks ("about you", skills).
- **Resume autofill:** upload a PDF (or paste text) → the Claude API extracts the
  fields for you to review and edit before saving.
- **Copy-to-clipboard** on every answer, so you can paste them straight into any
  external application form — the practical "autofill" surface for a web tracker.

**Implementation:**
- `Profile` Prisma model (single `singleton` row).
- `GET`/`PUT /api/profile` and `POST /api/profile/parse-resume` (server-side
  Claude call, `claude-opus-4-8`, structured outputs).
- `app/components/profile/ProfileForm.tsx` reusing the existing form conventions.
- Degrades gracefully without `ANTHROPIC_API_KEY` (manual entry still works).

**Future:** wire this profile into the Milestone 2 browser extension for true
on-page form autofill (filling fields directly on Greenhouse/Lever/Workday).

**Acceptance:** Upload a resume → fields populate → save → answers persist and
copy to clipboard.

---

## ✅ Milestone 1.6: Import Listing from URL

**Status:** Shipped · May 31, 2026
**Priority:** High

### One-paste import

Paste a job-posting link and import the listing straight into the tracker.

**What:**
- An **Import from URL** bar in the Add-job modal: paste a link → the app fetches
  the page and extracts company, role, location, location type, job type, salary,
  and a short summary, prefilling the form for review.
- Saving goes through the existing applications API, so the imported job is
  auto-verified against the gov.uk sponsor register like any other card.

**Implementation:**
- Extends `app/api/parse-url/route.ts` with AI extraction (Claude structured
  outputs) layered over the existing regex `<title>` parser, which remains the
  fallback. Guarded behind `ANTHROPIC_API_KEY` so the route never hard-fails.

**Acceptance:** Paste a real job URL → fields prefill → save → card appears on the
board with sponsor verification applied.

---

## 🔄 Milestone 2: Enhanced Interactivity

**Status:** Planned · Q3 2026  
**Effort:** 2-3 days  
**Priority:** High

### Browser Extension (Manifest V3)

Auto-capture job applications from popular job boards.

**What:** Content script detects form submissions on:
- Greenhouse (`greenhouse.io`)
- LinkedIn Easy Apply
- Lever (`lever.co`)
- Workday
- Workable
- Custom fallback: floating "Save job" badge on any `/jobs/`, `/careers/`, `/apply/` URL

**How it works:**
1. User applies for job on supported job board
2. Extension detects submission (XHR intercept, button observer, or URL change)
3. Extracts company + role from page title
4. POSTs to `/api/applications` with `source: "extension"`
5. Shows notification: "✓ Application saved — [Company] [Role]"

**Implementation:**
```
extension/
├── manifest.json          # Manifest V3 config
├── background.ts          # Service worker
├── content.ts             # Injected into pages
├── popup/
│   ├── popup.html
│   ├── popup.ts           # UI for captured jobs
│   └── popup.css
├── icons/                 # 16x16, 48x48, 128x128
└── dist/                  # Built output
```

**Steps:**
1. Create extension structure
2. Implement XHR interception + URL observers
3. Add site-specific extractors (Greenhouse, Lever, LinkedIn, Workday, Workable)
4. Implement fallback floating badge for unrecognized sites
5. Build popup UI: recent captures + settings (dashboard URL, toggles)
6. Integration test: simulate job board submission
7. Package and test in Chrome/Firefox
8. Update manifest to request appropriate permissions

**Testing:**
- Manual: Apply on real Greenhouse/LinkedIn/Lever job postings
- Verify: Applications appear in dashboard with correct company/role
- Edge cases: Multiple applications from same company, duplicate detection

**Acceptance:** Extension auto-captures 3+ real job applications without user intervention

---

## 🎯 Milestone 3: Better Kanban UX

**Status:** Planned · Q3 2026  
**Effort:** 1-2 days  
**Priority:** High

### Drag-and-Drop Board

Fully interactive Kanban with smooth animations and optimistic updates.

**What:** Use `@dnd-kit` to drag applications between columns.

**Features:**
- Drag card from one column to another → auto-updates status
- Reorder cards within same column
- Visual feedback: ghosted card during drag, highlight on hover
- Optimistic updates: UI responds instantly, rollback on error
- Touch-friendly for mobile

**Implementation:**
- Replace static KanbanBoard with dnd-kit wrappers
- Add `@DndContext`, `@Droppable`, `@Draggable` components
- Call PATCH API on drop
- Show loading spinner if network slow
- Toast notification on success/error

**Testing:**
- Drag card left to right (wishlist → applied → interview → offer)
- Drag card right to left (rejected → wishlist)
- Reorder within same column
- Network error → rollback to original position
- Mobile: touch drag works

**Acceptance:** Drag any card to any column, see instant UI update + API sync

---

## 📊 Milestone 4: Analytics & Insights

**Status:** Planned · Q4 2026  
**Effort:** 2-3 days  
**Priority:** Medium

### Application Funnel & Metrics

Track your job search progress over time.

**What:** Dashboard showing:
- **Funnel chart:** Wishlist → Applied → Interview → Offer (drop-off at each stage)
- **Timeline:** Applied-per-week (bar chart)
- **Stats:** Avg days from applied → interview, interview → offer
- **Conversion:** % of applied that reach each stage
- **Company comparison:** Which sectors/types have best conversion?
- **Tech vs non-tech:** Separate metrics by company type

**Implementation:**
- Add GET `/api/applications/stats` route (aggregations on DB)
- Create `<AnalyticsPage>` with Recharts or Chart.js
- Add link to analytics in sidebar
- Calculate metrics from application timestamps

**Data tracked:**
- appliedAt → interviewAt (auto-set on status change to "interview")
- interviewAt → offerAt (auto-set on status change to "offer")
- rejectedAt (auto-set on status change to "rejected")

**Update Prisma schema:**
```prisma
model Application {
  // ... existing fields
  interviewAt  DateTime?
  offerAt      DateTime?
  rejectedAt   DateTime?
}
```

**Testing:**
- Create 20 test applications across all statuses
- Verify funnel calculations (e.g., 10 applied, 3 interview = 30% conversion)
- Check timeline aggregations by week
- Validate company type segmentation

**Acceptance:** Analytics page shows accurate funnel, timeline, and conversion rates

---

## 🏢 Milestone 5: Company Research & Ratings

**Status:** Planned · Q4 2026  
**Effort:** 2-3 days  
**Priority:** Medium

### Sponsor Company Profiles

Enriched company data to help prioritize applications.

**What:**
- Company detail page: salary ranges, benefits, visa sponsorship history
- User ratings: "How easy to work with?", "Quick response?", "Sponsor timeline?"
- Community feedback: Anonymous reviews from other applicants
- Visa info: Typical sponsorship timeline, visa category support
- Location insights: Office address, commute from your postcode

**Implementation:**
- Add Company model (linked to Applications)
- Create `/companies/[name]` route
- Add rating form (stars, comment) on application detail
- Aggregate ratings (avg, distribution)
- Show visa timeline estimates

**Data model:**
```prisma
model Company {
  id        String   @id @default(cuid())
  name      String   @unique
  ratings   Rating[]
  createdAt DateTime @default(now())
}

model Rating {
  id        String   @id @default(cuid())
  company   Company  @relation(fields: [companyId], references: [id])
  companyId String
  rating    Int      // 1-5 stars
  comment   String?
  category  String   // "work-culture" | "sponsorship" | "responsiveness"
  createdAt DateTime @default(now())
}
```

**Testing:**
- Create company, add 3 ratings, verify avg calculated
- Check ratings appear on company profile
- Filter by category (sponsorship vs culture)

**Acceptance:** Company page shows aggregated ratings from real users

---

## 🔔 Milestone 6: Smart Notifications

**Status:** Planned · 2026  
**Effort:** 1-2 days  
**Priority:** Low

### Application Tracking Alerts

Never miss a deadline or follow-up.

**What:**
- Email digest: Weekly summary ("you applied to 5 companies, 1 interview")
- Reminders: "Follow up with Monzo — 2 weeks since application"
- Interview prep: Notification 24h before scheduled interview
- Offer alert: Celebrate when you get an offer (loud notification)
- Browser notification: Instant update when application status changes

**Implementation:**
- Add notification preferences in `/settings`
- Cron job: Run daily to check for reminders
- Email service: SendGrid or Resend
- Browser API: Notification.requestPermission()

**Testing:**
- Create application, set follow-up date 2 weeks out
- Run daily job → verify email sent
- Accept browser notification permission → verify desktop alert

**Acceptance:** Receive email/notification based on configured reminders

---

## 📱 Milestone 7: Mobile App (Long-term)

**Status:** Planned · 2027  
**Effort:** 4-5 days  
**Priority:** Low

### Native Mobile App

Use Expo/React Native for iOS + Android.

**What:**
- View dashboard on mobile (read-only or light edits)
- Quick-add new application from home screen
- Push notifications for interviews/offers
- Share application progress with friends (optional)

**Implementation:**
- Use Expo to scaffold React Native project
- Reuse API layer (same backend)
- Share TypeScript types across web + mobile
- Implement push notifications (OneSignal or Firebase Cloud Messaging)

**Testing:**
- Manual testing on iOS simulator
- Manual testing on Android emulator
- Push notification delivery

**Acceptance:** Can view dashboard and add applications on iOS/Android

---

## 🔐 Milestone 8: User Accounts & Sync

**Status:** Planned · 2026  
**Effort:** 2-3 days  
**Priority:** Medium

### Authentication & Multi-Device Sync

Keep applications in sync across devices.

**What:**
- User signup/login (email + password or OAuth)
- Data persists: applications sync to cloud
- Multiple devices: changes on phone appear on desktop instantly
- Private data: Only you can see your applications

**Implementation:**
- Add User model to Prisma
- Use NextAuth.js for auth
- Move applications to cloud (migrate from SQLite)
- Add realtime sync (WebSocket or polling)

**Data model:**
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
  userId       String
  user         User          @relation(fields: [userId], references: [id])
}
```

**Testing:**
- Sign up → create application
- Sign in on different device → see same application
- Edit on phone → refresh web → see update

**Acceptance:** Multi-device sync works seamlessly

---

## 🎓 Milestone 9: Visa Sponsorship Guide

**Status:** Planned · 2026  
**Effort:** 1 day  
**Priority:** Low

### Educational Resources

Help users understand the sponsorship process.

**What:**
- Visa timeline: Typical sponsorship process (3-4 months)
- Eligibility checklist: Points test, CoS requirements
- Company obligations: What sponsors must do
- Common mistakes: What to avoid
- FAQ: Top 10 questions about Skilled Worker visa
- Links: gov.uk, UKVI, visa lawyer resources

**Implementation:**
- Create static `/guides` section
- Markdown-based content
- Link from sponsor detail page to relevant sections

**Testing:**
- Verify all links work
- Check content accuracy against gov.uk

**Acceptance:** Guide section accessible and helpful

---

## 🚀 Milestone 10: Advanced Search & Matching

**Status:** Planned · 2027  
**Effort:** 2-3 days  
**Priority:** Low

### Smart Job Recommendations

AI-powered sponsor matching based on your background.

**What:**
- User profile: Your tech stack, experience level, salary expectations
- Sponsor matching: "Top 10 sponsors for your profile"
- Alerts: New sponsors match your criteria
- Salary comparison: "Average salary for your role at matched sponsors"

**Implementation:**
- Add Profile model (tech stack, experience, salary range)
- Scoring function: matches user skills to company tech keywords
- Cron job: Daily matching run
- Email alerts: "5 new sponsors matched your profile"

**Testing:**
- Create profile (Python, 2 years experience, £60k+)
- Run matcher → verify it finds DataCrumbs, Wayve, etc.

**Acceptance:** Recommendations accurate and relevant

---

## Summary

| Milestone | Status | Effort | Priority | Impact |
|-----------|--------|--------|----------|--------|
| 1. MVP | ✅ Complete | N/A | — | Foundation |
| 1.5. Application Profile & Resume Autofill | ✅ Complete | N/A | High | Less per-application effort |
| 1.6. Import Listing from URL | ✅ Complete | N/A | High | Faster capture |
| 2. Browser Extension | 🔄 Planned | 2-3d | High | Auto-capture |
| 3. Drag-and-Drop | 🔄 Planned | 1-2d | High | UX improvement |
| 4. Analytics | 🔄 Planned | 2-3d | Medium | Insights |
| 5. Company Ratings | 🔄 Planned | 2-3d | Medium | Social proof |
| 6. Notifications | 🔄 Planned | 1-2d | Low | Reminders |
| 7. Mobile App | 🔄 Planned | 4-5d | Low | Multi-platform |
| 8. User Accounts | 🔄 Planned | 2-3d | Medium | Cloud sync |
| 9. Visa Guide | 🔄 Planned | 1d | Low | Education |
| 10. AI Matching | 🔄 Planned | 2-3d | Low | Recommendations |

**Total effort:** ~20-25 days of development (excluding testing & polish)

**Recommended order:** 2 → 3 → 4 → 8 → 5 → 6 → 9 → 10 → 7

**Rationale:**
- Browser extension (2) has highest impact on user friction
- Drag-drop (3) improves daily UX immediately
- Analytics (4) helps users understand progress
- Cloud sync (8) enables mobile access
- Company ratings (5) builds community
- Notifications (6) reduce churn
- Educational content (9) solves user anxiety
- AI matching (10) drives engagement
- Mobile app (7) is longer-term investment
