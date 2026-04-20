# Context Ledger

## Purpose

This file stores compact but durable project context snapshots so the product, data, and implementation state does not get lost across long conversations.

Rule for future work:

- every time a new meaningful compact context is created, append a new dated entry here
- each entry should include product scope, backend state, UI state, and immediate next steps
- keep entries concise but complete enough for future recovery

---

## Snapshot: 2026-04-20 - Founder / CEO Phase 1 Implementation

### Product Scope Locked So Far

The app is being built founder-first / CEO-first.

The CEO scope currently includes:

- portfolio command center across multiple companies
- company health visibility
- a company department layer for founder visibility
- people summary
- finance visibility
- ownership and funding visibility
- document management
- KAI strategic layer

### Planning Docs Created

Current planning/docs set:

- `docs/phase-0-product-brief.md`
- `docs/founder-mvp-scope.md`
- `docs/founder-user-flows.md`
- `docs/domain-model.md`
- `docs/kai-strategy.md`
- `docs/document-management-spec.md`
- `docs/phase-1-schema-gap-analysis.md`
- `docs/founder-data-contract.md`
- `docs/phase-1-migration-spec.md`
- `docs/implementation-roadmap.md`

### Backend Changes Implemented

Migration created:

- `supabase/migrations/20260420093000_founder_phase1_foundation.sql`

This migration:

- extends `startup_documents`
- adds `startup_departments`
- adds `department_updates`
- backfills default startup departments for each startup
- adds indexes, triggers, and RLS policies

### App/Data Layer Changes Implemented

Files updated for real implementation:

- `src/integrations/supabase/types.ts`
- `src/hooks/useStartupHub.ts`
- `src/components/startup-hub/DocumentsTab.tsx`
- `src/components/startup-hub/DepartmentUpdatesPanel.tsx`
- `src/pages/StartupDetail.tsx`

### What The New App Layer Supports

The app now supports:

- richer company document metadata
- signed access URLs for private startup documents
- startup departments as first-class records
- structured department updates
- a founder-facing department summary panel inside startup detail

### Important Technical Note

The `startup-documents` bucket is private.

Current implementation direction:

- store files privately
- create signed URLs for access in app
- do not depend long-term on public file URLs for company-sensitive documents

### Current UI Reality

The founder UI is still partly mixed:

- some sections now have real backend shape
- many founder command center sections still rely on static data in `src/data/*`
- founder command center needs a stronger UI pass plus real founder overview selectors

### Immediate Next Product/UI Target

Best next UI target:

- redesign the CEO command center
- make startup detail feel more intentional and executive-grade
- surface department updates, finance, document repository, and ownership context more clearly

### Verification State

Build verification completed successfully with:

- `npm.cmd run build`

Known warning:

- large bundle size warning from Vite

### Workflow Note

This repo is connected to Lovable.

Preferred workflow for UI:

- lock product/data requirements here first
- generate Lovable prompt from this repo state
- ask Lovable to generate the UI pass
- then integrate or refine locally as needed

---

## Snapshot: 2026-04-20 - Department Taxonomy Expanded

### Change Summary

The original founder planning assumed five company departments. That is no longer the canonical model.

The current company department taxonomy is now:

- social media
- video production/editing
- content management
- studio
- tech
- creators/brands outreach
- HR
- graphic designing
- office management

### What Was Updated

This taxonomy was updated across:

- founder docs
- data contract docs
- migration seed/default startup departments
- app department catalog
- founder-facing department summary panel
- Lovable founder UI prompt
- onboarding department selection

### Important Product Note

Finance remains an important founder module and dashboard area, but it is no longer one of the default company department cards in the new department taxonomy.

---

## Snapshot: 2026-04-20 - Branching Strategy Before Lovable UI Import

### Current Git State

The working tree is currently on `main`.

The founder phase work is not committed yet and includes:

- founder/backend foundation changes
- new docs
- startup department updates
- document management and startup hub improvements

### Recommended Workflow

Before pulling or applying Lovable UI changes:

- create a new feature branch from the current working tree
- keep the existing founder/backend work on that branch
- commit the current foundation work first
- bring Lovable UI changes into the same branch after that commit
- only merge back to `main` after build verification and UI review

### Why This Matters

This keeps generated UI work away from `main`, makes the diff easier to review, and avoids mixing future Lovable imports with an already dirty default branch.

---

## Snapshot: 2026-04-20 - Lovable Uses Main Branch

### New Workflow Constraint

Lovable will apply UI changes against `main`.

That means `main` must be treated as the handoff branch for generated UI work rather than the place for ongoing manual backend implementation.

### Recommended Branch Roles

- `main` = latest Lovable output and approved shared baseline
- `feature/founder-phase1-foundation` = backend, schema, docs, and product foundation checkpoint
- integration branch from latest `main` = place to merge backend foundation with Lovable UI output

### Safe Operating Model

When a new Lovable UI pass is ready:

- pull the latest `main`
- create or refresh an integration branch from that updated `main`
- merge the founder foundation branch into the integration branch
- resolve conflicts and test there
- merge back into `main` only after validation

### Why This Model Fits

This keeps `main` compatible with Lovable, prevents backend work from blocking UI generation, and gives us a safe branch for conflict resolution and final integration.

---

## Snapshot: 2026-04-20 - Lovable Schema Decision For Founder UI

### Recommended Answer

For the founder/CEO phase, Lovable should use:

- `Add the missing tables (full fidelity)`

### Why

The current product direction and local implementation already assume:

- `startup_departments`
- `department_updates`
- richer `startup_documents` metadata

Choosing a reduced-schema path would weaken the department command layer and document repository, and would create unnecessary rework during integration.

### Prompt Correction

The Lovable founder UI prompt was also corrected to remove outdated references to "five departments" so it now aligns with the canonical 9-department taxonomy.

---

## Snapshot: 2026-04-20 - Founder UI Aesthetic Direction

### Chosen Direction

For the founder/CEO UI, the chosen visual direction is:

- `Editorial / FT-inspired`

### Why This Was Chosen

This best matches the desired product tone:

- premium
- executive
- strategic
- restrained
- distinct from generic SaaS dashboards

### Implementation Guidance

- use serif display typography only for major executive headings
- keep operational UI copy in a clean sans serif
- favor warm off-white, ink, charcoal, and restrained ochre accents
- keep data modules crisp and implementation-friendly
- avoid turning the interface into a novelty newspaper aesthetic

---

## Snapshot: 2026-04-20 - Founder UI Scope For Lovable Phase 2

### Chosen Scope

For the next Lovable pass, the selected scope is:

- `All four surfaces`

### Included Surfaces

- founder command center
- startup detail
- department command layer
- document repository

### Why This Was Chosen

The startup detail experience depends on the department layer and document repository to feel complete.

If those are deferred, the result will likely feel visually fragmented and will create a second round of UI rework for one of the most important founder workflows.

---

## Snapshot: 2026-04-20 - Lovable Phase 2 UI Merged Into Integration Branch

### Branch State

Latest Lovable UI changes were fetched from remote `main` and merged into:

- `feature/founder-ui-phase2`

The merge completed cleanly without conflicts.

### What Arrived From Lovable

The incoming UI pass touched founder-facing surfaces including:

- founder command center
- startup detail
- department layer related components
- document repository related components
- styling and theme files
- an additional Supabase migration from Lovable

### Verification

Production build verification completed successfully after the merge with:

- `npm.cmd run build`

### Known Follow-Up

The branch is now the active integration branch for:

- reviewing the Lovable UI quality
- checking schema overlap between the existing founder migration and the new Lovable migration
- refining any UX or data wiring gaps before merging back to `main`

---

## Snapshot: 2026-04-20 - Founder Workflow Progress Check

### Current Position

The project is now between Phase 2 and Phase 3 of the founder roadmap.

What is already in place:

- founder product definition and scope docs
- founder schema and migration planning
- founder UI redesign pass from Lovable merged into the integration branch
- startup detail document and department surfaces present in the app
- build verification passing on the integration branch

### What Is Still Partial

Several founder-facing surfaces still rely partly on static or heuristic data rather than a fully real founder data layer.

Current gaps still include:

- founder command center still mixes real startup and people data with static KAI/demo data
- company intelligence is not yet backed by production KAI flows
- schema overlap between the local founder migration and Lovable migration still needs consolidation
- end-to-end CRUD and seeded usage for department updates and document workflows still need hardening

### Immediate Next Work

The highest-leverage next step is:

- stabilize the merged branch by reconciling migrations and wiring founder UI sections to real data as much as possible before moving into KAI integration

---

## Snapshot: 2026-04-20 - Founder Schema Reconciliation Started

### What Was Decided

For the founder integration branch, the app-facing schema shape from the current UI and generated Supabase types is now treated as the final target.

That means the final founder schema expects:

- `startup_departments.name`
- `startup_departments.lead_person_id`
- `department_updates` without a required `startup_department_id`
- `department_updates` list fields as `text[]`
- `startup_documents` to keep the richer founder metadata plus upload-related fields

### What Was Changed

The later Lovable migration was converted into a defensive reconciliation migration so it can:

- work after the earlier founder foundation migration
- provision the final app-compatible schema on fresh environments
- create or enforce the private `startup-documents` storage bucket and policies

### Why This Matters

Without this reconciliation, a fresh database setup could fail because the two founder-related migrations define overlapping tables with incompatible column names and shapes.

---

## Snapshot: 2026-04-20 - Founder Surfaces Moved To Real Derived Data

### What Changed

Two core founder-facing surfaces were moved away from static/demo intelligence and onto real derived summary hooks:

- `FounderCommandCenter`
- `StartupDetail`

### New Summary Layers

New hooks were introduced for this:

- `src/hooks/useFounderOverview.ts`
- `src/hooks/useStartupExecutiveOverview.ts`

These hooks now derive signals from real repo data where available, including:

- startups
- people
- tasks
- startup_departments
- department_updates
- startup_documents
- financial tables
- stakeholders
- funding_rounds

### Practical Result

The founder command center no longer depends on the old static KAI portfolio brief file for its main executive summary.

The startup detail page no longer depends on hardcoded startup-specific KAI or problem fixtures for its main strategic panels.

### Verification

Production build verification passed after these changes with:

- `npm.cmd run build`
