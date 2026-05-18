# Engineering Audit — Founder OS

*Senior-engineer-perspective audit of what's incomplete, what's intern-quality vs production-grade, and what needs to land before this app can be presented as anything other than a sharp MVP demo.*

**Created:** 2026-05-16
**Repo state at write time:** 24 page-level views, ~60 migrations, 12 edge functions, **1 test file** that asserts `true === true`, **255 `as any` type casts**, **no CI/CD**.

---

## How to use this document

- **P0** items are blockers — they prevent the product from being usable for its stated purpose, or they're security holes
- **P1** items are the difference between "MVP demo" and "real product" — must be fixed before scale, before external eng joins, before a buyer or investor audits the codebase
- **P2** items are polish — visible quality wins, don't block anything

The "What I'd do first" section at the bottom is the strict execution order if someone walked in cold tomorrow.

---

## P0 — Missing pieces that block the product vision

### 🔴 Finance / Finance Manager UI is missing

The CEO can view a CFO dashboard (`CfoDashboard.tsx` exists and reads real tables: `financial_entries`, `cash_flow_entries`, `burn_categories`, `financial_forecasts`).

But **a Finance Manager cannot actually do their job in this app.** There is no:

- Expense entry form (vendor, category, amount, GST, receipts)
- Payroll → ledger linkage (`payroll_payments` doesn't post to `financial_entries`)
- Invoice management (issued, received, paid, overdue)
- Vendor / client master data
- Proper P&L, balance sheet, cash flow statement views
- GST / TDS calculations
- Bank reconciliation
- Expense approval workflow for amounts above a threshold
- Recurring expense register (rent, SaaS, salaries)
- Finance Manager role / dashboard / guard

The CFO dashboard is read-only. Someone has to enter the financial data somewhere — and right now there's nowhere to enter it from inside the app.

### 🔴 Seven of nine departments have no dashboard

`startup_departments` is seeded for all nine: Social Media, Video Production/Editing, Content Management, Studio, Tech, Creators/Brands Outreach, HR, Graphic Designing, Office Management.

**Tech and HR have full dashboards. The other seven are unbuilt.**

| Department | What's missing |
|---|---|
| Social Media | Campaign tracker, content calendar, reach metrics, brand-client list |
| Video Production / Editing | Shoot scheduling, editing queue (Kanban), turnaround time SLA, asset/footage management |
| Content Management | Publishing calendar, QA workflow, metadata/CMS ops, scheduling |
| Studio | Booking calendar, equipment register, room availability |
| Creators / Brands Outreach | CRM (deal pipeline, retainers, contracts), commission tracking |
| Graphic Designing | Design request queue, asset library, brand kit |
| Office Management | Vendor management, AMC tracker, admin asks |

### 🔴 KAI is half-built

- `kai_insights` table exists; used only by the weekly tech digest
- `kai-ask` edge function exists; **no CEO chat UI** wires it for live conversation
- No cross-department intelligence — KAI doesn't see HR + Tech + Finance together
- `KaiPortfolioIntel`, `KaiStrategicBrief`, `KaiPrediction` components exist as scaffolding but pull mock data
- The predictive layer from the original product vision doesn't exist

### 🔴 Connectors stuck at the loading screen

- Framework built, edge functions written
- **Zero real data flowing**
- Until the GitHub PAT and Slack bot token are wired, every "this dashboard will light up when…" promise is unfulfilled
- PR Pulse on `/team/tech` is still mocked data
- Weekly digest computes from real DB tables but real GitHub PR signals are absent

### 🔴 Multi-tenancy is fake

- Schema has `startup_id` on most tables, but UI assumes one company
- Founder OS sales pitch is "manage multiple startups" — currently it's "manage Nasheedio"
- "Adding a second company" is not a flow that exists

---

## P1 — Production-grade hygiene that's missing

### Testing — effectively zero

- 1 test file. It tests that `true === true`.
- No component tests. No hook tests. No edge function tests. No E2E.
- Any senior eng's first reaction reading the repo: *"how do you know any of this works?"*
- Highest-stakes test gaps: RLS policies, payroll math, leave-approval auto-attendance, MFA verification, edge function happy paths.

### CI/CD — does not exist

- No `.github/workflows/`. No automated typecheck, no lint, no test on push.
- Lovable handles deployment; no preview environments for PRs; no rollback strategy.
- One commit of GitHub Actions config would catch ~80% of the silly errors before they reach prod (the duplicate `CheckCircle2` import that blacked out the page would have been caught in 10 seconds).

### TypeScript discipline — 255 `as any` casts

- Most are on Supabase responses: `.insert({…} as any)`
- Indicates we're bypassing the generated types rather than fixing them
- The generated `supabase/types.ts` isn't being regenerated after every migration consistently
- New tables (bugs, leave_requests, payroll_payments, attendance_records, etc.) may or may not be in the types file at any given moment

### Error handling — toasts and prayers

- Generic `toast.error(e?.message ?? "Couldn't…")` everywhere
- **No error boundaries** — a single component crash blanks the page (see the recent `CheckCircle2` incident)
- No retry logic on transient failures
- No error tracking (Sentry, Bugsnag, etc.)
- Debugging an edge function failure took 5 messages this morning; with proper observability it would be a 30-second fix

### Logging & observability — none

- Edge functions `console.error` and that's it
- No structured logging, no log aggregation
- No performance monitoring (slow queries, slow API calls)
- No usage analytics (which features are used? Who's stuck where?)

### Security — multiple holes

- **2FA built but disabled** — email delivery failed (Resend domain restrictions) and the root cause was never fixed. Currently `mfa_required = false` for everyone.
- No login attempt rate limiting visible
- No session timeout policy
- No password complexity rules beyond Supabase defaults
- No security audit log (who tried to access what, who logged in from where)
- RLS coverage is decent but not audited — `as any` insert paths can bypass intent
- File uploads to Supabase Storage with no virus scanning, no server-side MIME validation
- No CSRF defense reviewed (assuming Supabase handles it, but unverified)

### Pagination — hardcoded LIMIT

- `LIMIT 100`, `LIMIT 200` scattered across hooks
- At 50 employees this is fine. At 500 it breaks. At 5,000 it crashes the browser.

### Realtime conflict handling — last-write-wins

- Two HR people editing the same payroll entry: whoever saves last wins, no warning
- No optimistic locking, no conflict resolution UI

### Mobile responsiveness — untested

- 9-tab HR Dashboard will overflow on mobile
- Tables (attendance, payroll) use fixed widths
- The whole app is desktop-first; no responsive testing visible

### Accessibility — basic at best

- Some buttons missing `aria-label`
- Color contrast not audited
- Keyboard navigation works for Cmd+K and forms but not custom kanbans/calendars
- No focus management on modals (focus trapping)

---

## P1 — Schema and architecture concerns

### Duplicate `notifications` table CREATE

`notifications` table is `CREATE`d in **two migrations** (`20260424222511` AND `20260425000000`). Whichever ran first sticks. Brittle.

### `profiles.role` and `user_roles` table — overlapping concepts

Some code uses `profile.role` directly, some uses `has_role()` against the `user_roles` table. RLS is inconsistent — sometimes one, sometimes the other. Should consolidate to one model.

### `people` vs `profiles` — fuzzy boundary

Seeded people have UUIDs matching auth users, but only because we made it so. Real-world: not every employee has an auth account. `assignee_profile` FKs to `auth.users` so anyone not logged in can never be assigned. That's wrong for real ops (HR collects from employees who don't use the app).

### Soft delete inconsistency

- Bugs: no delete allowed
- Project messages: soft delete (`deleted_at`)
- Bug comments: soft delete
- Project tasks: hard delete
- Leave requests: status='cancelled' (soft)

Pick one model and apply it consistently.

### No audit trail

- `updated_at` tells you when, but not who changed what, from what to what
- HR + finance regulators (and lawsuits) want this. Critical for any company > 20 people.

### `linked_startups text[]` on people — denormalized

- No FK, no integrity. Can contain garbage strings.
- Should be a junction table.

### Indexes likely missing for hotspots

- `bugs` table: no composite index on `(project_id, status, created_at)` which is the most common query
- `attendance_records by (attendance_date, status)`: exists but no covering index
- Probably fine for 50 users; will hurt at 5,000

### Migrations directory — 60 files, no consolidation

- A senior eng would squash these for v1 production launch
- Some are Lovable-generated with random hash names — hard to read history
- No `seed.sql` separation from schema migrations

### Hardcoded values everywhere

- `"nasheedio"` slug hardcoded in 6+ places
- Department keys (`"tech"`, `"hr"`) hardcoded in route guards, dashboards, RLS
- INR currency hardcoded in payroll/finance UIs

---

## P1 — Business logic gaps

### CEO global view (`FounderCommandCenter`) — disconnected

- 868 lines, mostly pre-existing, **doesn't surface any of the new data** (bugs, attendance, payroll, reviews, candidates)
- Should be the single pane of glass for the founder; currently it's a separate world from everything we've built

### Cross-department intelligence

- No "show me everyone with deadlines this week" view across projects + bugs + tasks
- No "company velocity" page (anything shipped this week across all teams)
- No "company health" dashboard combining HR + finance + tech signals

### Approvals framework — only leave has one

Leave has an approval flow. Nothing else does.
- Purchase requests
- Expense reimbursement
- Bonus approvals
- Project-create gates
- Hiring offer signoff
- Performance review override

All need approval workflows. None exist as a unified framework.

### Document management — per-project only

- Company-wide policies, contracts, employee handbook — no place for these
- Existing `startup_documents` table is for the CEO; no employee-facing equivalent

### Org chart — doesn't exist

- Founder OS has departments + people but no visual hierarchy / reporting structure
- Performance reviews assume HR knows who reviews whom — they figure it out manually

### Skills / competencies — not modeled

- Can't search "who knows Postgres?"
- Can't see what someone's good at on their profile
- The "Tech Lead can find the right person" use case fails

### Holiday calendar

- Indian public holidays, company holidays, optional holidays — nowhere
- Affects leave calculations and attendance expectations

### Reporting / analytics

- No "month-on-month attrition" chart
- No "PR velocity over 12 weeks" trend
- No "bugs solved per dev" leaderboard
- Everything is point-in-time current state — no historical analysis

---

## P2 — UX polish that separates "real product" from "demo"

### Bulk operations — missing everywhere

- HR can't approve 5 leaves at once
- Can't mark 10 payroll entries paid in one click
- Can't bulk-import employees from CSV
- Can't bulk-update bug statuses

### Data export — almost none

- CSV export for bugs was mentioned but never built
- No PDF payslips
- No PDF performance reviews
- No quarterly reports export
- No financial statement export

### Empty states — inconsistent

- Some pages have nice "no data yet" panels, others just disappear
- Loading skeletons vary in quality

### Search — basic

- Plain `ILIKE %query%` everywhere
- No fuzzy matching, no debouncing on most searches
- No saved searches (except bugs)
- Cmd+K palette is OK but doesn't cover every entity

### Notifications — noisy and dumb

- No user preferences (mute, customize per-event)
- No email / Slack / push integration — only in-app
- No "digest" mode (daily summary vs realtime)
- Old read notifications pile up forever (no auto-archive)
- Hardcoded message strings — not localized, not templated

### User onboarding — doesn't exist

- New users land cold with no tour, no tooltips, no welcome flow
- `/onboarding` page exists for role selection but nothing teaches the product

### Help & documentation — none

- No in-app help center
- No tooltips explaining icons / features
- No CLAUDE.md / README for new developers contributing to the codebase

---

## P2 — Department-specific gaps even in what's built

### Tech department

- Slack token never wired — work updates tab is empty
- GitHub PAT never wired — PR Pulse is mocked
- No code review SLA tracking
- No deployment / release management
- No incident management (on-call rotations, etc.)

### HR

- **Slack auto-fill for attendance + work updates** — code is ready, never wired
- **Per-department review templates** — flexible schema in place, UI doesn't expose customization
- **Leave balance / quotas** — apply-anything flow with no per-type allocation tracking
- **Expense reimbursement** — separate from payroll, doesn't exist
- **Birthday / work anniversary reminders** — none
- **Org chart** — none
- **Skills database** — none
- **Public holidays** — none

### Project management

- No Gantt / timeline view
- No dependencies between tasks
- No milestones / releases (table exists, no UI)
- No time tracking
- No estimation vs actual reporting
- No epics / grouping above tasks

---

## The intern-vs-senior tell

What gives away the "shipped fast" energy when reading the code:

- `// removed comments`, `as any`, hand-rolled regex parsers without tests
- Mock data still in production components (PR Pulse list)
- Two migrations defining the same `notifications` table
- One test file
- `console.error` as primary error reporting
- Hardcoded `"nasheedio"` in 6+ places
- A `Verify2FA` page that ships disabled because the email backend isn't fully verified
- A duplicate-import bug that took the entire page to black

All of these are fixable in a focused cleanup sprint. They need to be fixed before this app is presented as anything other than a sharp MVP demo.

Right now it's an impressive MVP that's pretending to be enterprise-grade. With ~2 focused weeks of work on P0/P1 above, it becomes the real thing.

---

## What I'd do first — strict execution order

If someone handed me this repo cold tomorrow, this is the order:

1. **Wire the connectors for real** — GitHub PAT + Slack bot token. Without real data the entire Tech dashboard and weekly digest are theatre.
2. **Build the Finance Manager UI** — expense entry, approval workflow, payroll-to-ledger posting, invoices. This is the largest functional gap.
3. **Fix 2FA email delivery** — switch to a Resend production tier or move to TOTP. Then enforce 2FA for founder + finance + HR.
4. **Add tests for the high-stakes flows** — leave approval auto-attendance, payroll math, RLS policies. Even 30 tests covering the money/access paths transforms confidence.
5. **Add an `audit_log` table** — who did what when, before HR/finance becomes regulator-relevant.
6. **Set up basic CI** — GitHub Actions running `tsc --noEmit` + tests + lint on every PR. 30 minutes of work, pays off forever.
7. **Pick one department template and replicate to the other 7** — Tech and HR are the templates. Social Media is probably highest-pain (most-used) — start there.
8. **Sentry-style error tracking** — pick a service, wire it up. Without it, you find out about prod bugs from your users.
9. **Make the founder dashboard actually a dashboard** — surface bugs + attendance + payroll + candidates + KAI insights in one view.
10. **Consolidate migrations, regenerate types, eliminate `as any`** — cleanup week before any external eng is hired.

---

## Bonus — quick wins that take <1 day each

These would meaningfully lift code quality without touching scope:

- Add `eslint-plugin-import` with `no-duplicate-imports` rule + run on commit hook (catches the bug that blacked out the page)
- Add a global error boundary at App level that shows a fallback UI instead of blank screen
- Replace all `as any` on Supabase responses with regenerated types
- Wire `react-query`'s `onError` to a toast helper so we don't write error handling in every mutation
- Add a `<NumberInput />` and `<DateInput />` primitive so we stop reinventing them per page
- Consolidate avatar+initials logic (currently duplicated in ~6 places) into one component
- Add a `useDebounce` and use it everywhere a search input exists

---

## What's NOT in this audit

Things that were considered but are explicitly *not* problems right now:

- Performance — at 50 users with the data we have, performance is fine. Will become P1 at 500+.
- SEO — not applicable for an internal tool.
- Browser compatibility — assumed Chromium-based for the team. Safari/Firefox testing can wait.
- Internationalization — single-locale internal app for now.
- Mobile native app — desktop-first by design for internal use.

These become P1 if/when the product opens to a different audience.
