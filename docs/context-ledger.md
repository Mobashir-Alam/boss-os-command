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
