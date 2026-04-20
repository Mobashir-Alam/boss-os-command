# Phase 1 Migration Spec

## Purpose

This document turns the Phase 1 gap analysis into a concrete backend change plan.

It is intentionally focused on the first CEO-enabling schema changes only:

- richer document metadata
- department modeling
- department updates
- safe rollout order

This is a migration spec, not the final SQL file yet.

## Migration Goals

The first schema changes should let us do three things:

1. model company documents in a CEO-usable way
2. model the five company departments as first-class entities
3. store structured department updates for founder review

We should avoid broad refactors in this batch. The goal is to create the minimum strong foundation needed for the founder dashboard and company drill-down to become real.

## Migration Principles

### 1. Preserve Existing Features

Do not break:

- current `DocumentsTab`
- current finance flows
- current ownership flows
- current startup detail page

### 2. Prefer Extension Over Rewrite

Where possible:

- extend `startup_documents`
- do not replace working finance tables
- do not redesign `people` yet

### 3. Add Founder-Useful Structure

The new tables should directly support:

- department-level summaries
- CEO drill-down
- future KAI inputs

### 4. Maintain Backward Compatibility

Do not drop existing columns that current UI depends on in the same batch.

Important example:

- keep `startup_documents.doc_type` in the first migration
- add new metadata columns beside it
- migrate UI later

## Batch Overview

Recommended first migration batch:

- `Migration A`: extend `startup_documents`
- `Migration B`: create `startup_departments`
- `Migration C`: create `department_updates`
- `Migration D`: add indexes, constraints, and RLS policies

## Migration A: Extend `startup_documents`

### Current State

Current columns:

- `id`
- `startup_id`
- `file_name`
- `file_url`
- `doc_type`
- `uploaded_by`
- `created_at`

This is too thin for:

- rental bills
- purchase bills
- invoices
- legal records
- document filtering
- finance linking
- CEO review

### Proposed New Columns

Add:

- `title text null`
- `storage_path text null`
- `category text null`
- `subcategory text null`
- `document_date date null`
- `department text null`
- `vendor_name text null`
- `amount numeric(15,2) null`
- `currency text null default 'INR'`
- `linked_financial_entry_id uuid null references public.financial_entries(id) on delete set null`
- `linked_funding_round_id uuid null references public.funding_rounds(id) on delete set null`
- `linked_stakeholder_id uuid null references public.stakeholders(id) on delete set null`
- `notes text null`
- `tags jsonb not null default '[]'::jsonb`
- `status text not null default 'active'`
- `updated_at timestamptz not null default now()`

### Recommended Backfill

Immediately backfill:

- `title = file_name` where `title` is null
- `category` derived from existing `doc_type`

Suggested temporary mapping:

- `financials` -> `finance`
- `legal` -> `legal`
- `pitch-deck` -> `company_record`
- `other` -> `operations`

### Important Compatibility Rule

Do not drop `doc_type` in this migration.

Reason:

- current UI reads and writes `doc_type`
- we need one transition phase where both old and new fields coexist

### Recommended Constraints

Add a check constraint for `status` if we want controlled values:

- `active`
- `archived`
- `missing_reference`
- `needs_review`

Optional check constraint for `category` can come later if we want stricter control.

### Recommended Indexes

Create indexes on:

- `startup_id`
- `category`
- `department`
- `document_date desc`
- `linked_financial_entry_id`

## Migration B: Create `startup_departments`

### Why This Table Is Needed

The CEO product vision depends on department-level visibility, but right now departments are only weakly implied through `people.department`.

We need a first-class company-department record to power:

- company-level department cards
- department leads
- department status
- department summaries
- structured updates

### Proposed Table

`startup_departments`

### Proposed Columns

- `id uuid primary key default gen_random_uuid()`
- `startup_id uuid not null references public.startups(id) on delete cascade`
- `department_key text not null`
- `department_name text not null`
- `department_lead_person_id uuid null references public.people(id) on delete set null`
- `status text not null default 'watch'`
- `headcount integer not null default 0`
- `summary text null`
- `created_by uuid null references auth.users(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### Required Uniqueness

Add:

- unique constraint on `(startup_id, department_key)`

### Initial Department Keys

For the CEO-first product:

- `social_media`
- `video_production_editing`
- `content_management`
- `studio`
- `tech`
- `creators_brands_outreach`
- `hr`
- `graphic_designing`
- `office_management`

### Recommended Status Values

- `good`
- `watch`
- `critical`

### Recommended Indexes

- `(startup_id, department_key)`
- `department_lead_person_id`

## Migration C: Create `department_updates`

### Why This Table Is Needed

This is the core missing entity for the CEO experience.

The CEO needs structured updates from each department inside each company. Without this table, the app will keep faking this layer with notes or static content.

### Proposed Table

`department_updates`

### Proposed Columns

- `id uuid primary key default gen_random_uuid()`
- `startup_department_id uuid not null references public.startup_departments(id) on delete cascade`
- `startup_id uuid not null references public.startups(id) on delete cascade`
- `department_key text not null`
- `update_date date not null default current_date`
- `summary text not null`
- `wins jsonb not null default '[]'::jsonb`
- `blockers jsonb not null default '[]'::jsonb`
- `risks jsonb not null default '[]'::jsonb`
- `asks jsonb not null default '[]'::jsonb`
- `owner_person_id uuid null references public.people(id) on delete set null`
- `created_by uuid null references auth.users(id)`
- `created_at timestamptz not null default now()`

### Why JSONB Arrays Here

For wins, blockers, risks, and asks, JSONB arrays are a good MVP choice because:

- they are structured enough for KAI and UI rendering
- they are easy to seed and update
- they avoid over-normalizing too early

### Recommended Indexes

- `(startup_id, department_key, update_date desc)`
- `startup_department_id`

## Migration D: Triggers, Policies, And Safety

### Updated-At Trigger

For tables with `updated_at`, use the existing:

- `public.update_updated_at_column()`

Apply to:

- `startup_documents`
- `startup_departments`

### RLS Recommendations

To match current founder-first behavior, start with the same access shape as related tables:

- authenticated users can `select`
- founders can manage
- MFOs can manage

Later we can narrow department-update writes by department ownership and role.

### Proposed RLS For `startup_departments`

- `Authenticated can view startup_departments`
- `Founders can manage startup_departments`
- `MFOs can manage startup_departments`

### Proposed RLS For `department_updates`

- `Authenticated can view department_updates`
- `Founders can manage department_updates`
- `MFOs can manage department_updates`

### Proposed RLS For Extended `startup_documents`

Keep existing policies for now. No policy redesign is required in the first batch unless we add department-restricted writes later.

## Storage Note For Documents

This repo already creates:

- bucket `startup-documents`
- bucket is private

Current frontend upload code uses:

- `getPublicUrl(path)`

That is not the ideal long-term model for sensitive company files because:

- the bucket is private
- CEO/company documents should not rely on public URLs

### Recommended Direction

Keep the bucket private and later switch the app to:

- signed URLs for preview/download

### Migration Impact

This does not need a database schema change right now, but it should be tracked as a near-term implementation task.

## Rollout Order

### Step 1

Extend `startup_documents` first.

Reason:

- lowest risk
- immediately supports the document-management spec
- does not require UI redesign to exist

### Step 2

Create `startup_departments`.

Reason:

- department updates need a parent entity

### Step 3

Create `department_updates`.

Reason:

- this unlocks the CEO story directly

### Step 4

Backfill founder seed data.

For each startup:

- create five department rows
- add sample updates if needed for testing

## Recommended Seed Rules

For every company in seed data, create these departments:

- social media
- video production/editing
- content management
- studio
- tech
- creators/brands outreach
- HR
- graphic designing
- office management

Use a consistent `department_key` convention:

- lowercase snake_case

## Risks To Watch

### 1. Document Model Drift

If we leave both `doc_type` and `category` forever, the model will get messy.

Plan:

- keep both only during transition
- later move the UI fully to `category/subcategory`

### 2. Department Lead Linkage

`department_lead_person_id` depends on the quality of `people` data. That is acceptable for now, but should be treated as optional in the first version.

### 3. Finance Linking

`linked_financial_entry_id` is powerful, but only useful if finance entry creation later supports selecting a supporting document. That is a second-step workflow, not required on day one.

### 4. Sensitive File Access

Do not design CEO document access around public file URLs. The private bucket setup is the safer baseline.

## Definition Of Done For This Migration Spec

This step is complete when we agree on:

- new `startup_documents` columns
- `startup_departments` table
- `department_updates` table
- rollout order
- storage access direction

After that, the next natural step is to create the actual Supabase migration SQL files.
