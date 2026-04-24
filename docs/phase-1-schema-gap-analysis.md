# Phase 1 Schema Gap Analysis

## Purpose

This document maps the CEO product definition onto the current repo and Supabase schema.

The goal is to answer:

- what is already usable
- what is partially usable
- what is missing
- what we should change first

Phase 1 is not about polishing UI. It is about getting the data model clean enough that the CEO dashboard can become real instead of demo-driven.

## Current State Summary

The repo already has a stronger backend foundation than a typical demo:

- `startups`
- `people`
- `tasks`
- `priorities`
- `financial_entries`
- `burn_categories`
- `cash_flow_entries`
- `financial_forecasts`
- `funding_rounds`
- `stakeholders`
- `board_seats`
- `special_rights`
- `startup_documents`
- `startup_notes`
- `startup_milestones`
- `kai_memories`

The current limitation is not the total absence of data tables. The limitation is that CEO-facing concepts are spread across multiple low-level tables and some critical founder concepts are still missing as first-class entities.

## CEO Module Mapping

### 1. Portfolio Overview

Current source:

- `startups`
- `priorities`
- `tasks`
- `people`
- finance tables

What already works:

- company list
- status
- trend indicators
- runway string
- simple startup cards

Main gaps:

- no clean portfolio summary query
- startup health is not formally derived
- runway is stored as display text, not a reliable numeric metric
- some dashboard content is still coming from static `src/data/*`

Recommended Phase 1 action:

- define a founder overview data contract
- create derived selectors for health, risk, attention score, and summary counts

### 2. Company Drill-Down

Current source:

- `startups`
- `priorities`
- `people`
- `tasks`
- `startup_notes`
- `startup_milestones`
- `startup_documents`
- finance tables
- ownership tables

What already works:

- a strong drill-down shell exists in `StartupDetail.tsx`
- there are already tabs for finance, people, notes, milestones, contacts, documents, and memories

Main gaps:

- company overview still relies on static KAI and mock problem data
- no formal company summary query
- company facts are split across many hooks without one canonical aggregation layer

Recommended Phase 1 action:

- define one `startup_overview` contract for UI consumption
- separate source-of-truth data from demo-only display content

### 3. Department Updates

Current source:

- weakly represented through `people.department`
- some context can be inferred from tasks and notes

What already works:

- people records have a `department` field
- the startup people view can show department-level grouping

Main gaps:

- there is no `departments` table
- there is no `department_updates` table
- there is no structured department-summary record for CEO review
- department leads are not formalized

Recommended Phase 1 action:

- add `startup_departments`
- add `department_updates`
- later add `department_metrics`

This is the single biggest schema gap against the CEO product vision.

### 4. People Summary

Current source:

- `people`
- `startup_assignments`
- `profiles`

What already works:

- people have department, role, salary, reporting manager, KPI-style fields, and task counts
- startup people view already computes useful team summaries

Main gaps:

- `people.linked_startups` is array-based and can become hard to manage long term
- there is overlap between `people` and `profiles`
- team membership and startup membership are not fully normalized
- department lead relationships are not explicit

Recommended Phase 1 action:

- keep `people` for now
- do not redesign the entire people model yet
- use it for founder MVP, but mark normalization as future work

### 5. Financial Visibility

Current source:

- `financial_entries`
- `burn_categories`
- `cash_flow_entries`
- `financial_forecasts`

What already works:

- burn, inflow/outflow, revenue/expense, and forecast data models already exist
- `FinancesTab.tsx` already computes useful summaries

Main gaps:

- no explicit company cash balance source-of-truth
- runway appears partly computed and partly stored as string on `startups`
- no direct link between finance records and supporting documents

Recommended Phase 1 action:

- keep current finance tables
- add linking from finance entries to documents
- define one finance summary selector for CEO use

### 6. Ownership And Funding

Current source:

- `stakeholders`
- `funding_rounds`
- `board_seats`
- `special_rights`
- `equity_documents`

What already works:

- cap-table related data is already reasonably modeled
- funding rounds and governance concepts exist
- ownership engine already has a strong shape

Main gaps:

- founder dashboard does not yet aggregate these into high-signal CEO summaries
- dilution/control risk is not formalized as a derived signal

Recommended Phase 1 action:

- keep these tables
- build founder-facing summary selectors later

### 7. Document Management

Current source:

- `startup_documents`
- `equity_documents`
- Supabase Storage buckets through upload hooks

What already works:

- company documents can already be uploaded
- ownership documents already have a separate model

Main gaps:

- `startup_documents` metadata is too thin
- only `doc_type`, `file_name`, and `file_url` are stored today
- no category/subcategory model suitable for rental bills, purchase bills, invoices, legal docs, and company records
- no link to finance entries, departments, funding rounds, or stakeholders

Recommended Phase 1 action:

- extend `startup_documents`
- keep `equity_documents` for ownership-specific records
- do not create a second generic document table unless absolutely needed

### 8. KAI Inputs

Current source:

- startup, people, finance, ownership, and notes data exist
- `kai_memories` exists

What already works:

- enough structured data exists to power founder summaries later

Main gaps:

- no curated founder context object
- no stable data contract for GPT input
- some important CEO concepts still live in static data files

Recommended Phase 1 action:

- define a founder data contract first
- KAI should consume that contract later rather than querying raw tables directly

## Current Table-Level Assessment

### Keep As-Is For Now

- `funding_rounds`
- `stakeholders`
- `board_seats`
- `special_rights`
- `financial_forecasts`
- `kai_memories`
- `startup_notes`
- `startup_milestones`

### Keep, But Extend

- `startups`
- `startup_documents`
- `financial_entries`
- `people`
- `tasks`

### Add New Tables Soon

- `startup_departments`
- `department_updates`

### Future Normalization Candidates

- organization-level table
- normalized people-to-startup memberships
- document categories as separate lookup if needed
- stronger task assignment references

## Recommended First Migration Batch

The first migration batch should stay focused and avoid boiling the ocean.

### Migration 1: Extend `startup_documents`

Add likely fields:

- `title`
- `category`
- `subcategory`
- `document_date`
- `department`
- `vendor_name`
- `amount`
- `currency`
- `linked_financial_entry_id`
- `linked_funding_round_id`
- `linked_stakeholder_id`
- `notes`
- `tags`
- `status`
- `storage_path`

### Migration 2: Add `startup_departments`

Suggested fields:

- `id`
- `startup_id`
- `department_key`
- `department_name`
- `department_lead_person_id`
- `status`
- `headcount`
- `summary`
- `updated_at`

### Migration 3: Add `department_updates`

Suggested fields:

- `id`
- `startup_department_id`
- `startup_id`
- `department_key`
- `update_date`
- `summary`
- `wins`
- `blockers`
- `risks`
- `asks`
- `owner_person_id`
- `created_by`
- `created_at`

### Migration 4: Light founder-support extensions

Add only if needed after review:

- numeric runway source or cash balance source
- clearer health-scoring inputs
- maybe company-level metadata for founder reporting

## Recommended UI/Data Boundary

The founder UI should not read directly from a dozen tables forever.

Phase 1 should define service-level contracts such as:

- founder overview
- startup overview
- finance summary
- ownership summary
- document summary

The app can still use the existing tables under the hood, but the UI should begin consuming normalized view models instead of raw rows everywhere.

## Highest-Priority Gaps — CEO Layer

If we only solve the most important CEO gaps first, they should be:

1. founder summary data contract
2. department update model
3. document metadata model
4. finance-to-document linking
5. removal of static demo dependencies from founder views

## Gap Analysis — Lower Role Layers

The product serves four roles. The schema gaps below must be addressed for each role's layer to work.

### Employee Self-Reporting

What employees need to do:
- log which projects or tasks they are working on
- report percentage complete
- update their work status

Current gap:
- `tasks` table exists but is managed top-down (founder/manager assigns)
- no employee-facing task update flow
- no self-reported work log or status per employee per day/week
- no UI for employees to update their own task progress

Schema action needed:
- `tasks` table already has status and completion fields — wire these to employee-facing update UI
- consider adding `work_logs` table for structured daily/weekly employee reports if needed later

### Manager / Team Lead View

What managers need to see:
- all employees in their team
- task and project status per employee
- department update history

Current gap:
- `people` table has `reporting_manager` field but no manager-facing aggregation hook
- no manager dashboard that shows their team's live status
- `department_updates` table exists but only the CEO currently reads it; no manager write UI

Schema action needed:
- `department_updates` write UI (form for manager to log wins, blockers, risks, asks)
- manager-scoped query of `people` and `tasks` filtered by their department or team

### Finance Manager Data Entry

What finance managers need to do:
- enter salary and payroll per employee
- log expenses, vendor bills, purchase invoices
- upload supporting documents linked to financial entries

Current gap:
- `financial_entries`, `burn_categories`, `cash_flow_entries` tables exist but are read-only in the UI
- no data entry forms for expenses, salaries, or vendor payments
- `startup_documents` upload partially exists but not linked to financial entries in the UI
- `people.salary` field exists but no payroll management UI

Schema action needed:
- no new tables required immediately
- build data entry forms on top of existing finance tables
- build salary/payroll update UI on `people` table
- build document upload + link-to-entry UI in finance context

### KAI Full Data Pipeline

What KAI needs to work properly:
- access to all data: employees, tasks, departments, finances, ownership, documents
- structured aggregation into a single context payload
- sent to an external AI API (not just Lovable's gateway)
- response contains strategic insights, risk signals, market intelligence

Current gap:
- KAI currently only receives a short summarized text string as context
- no raw data aggregation pipeline exists
- no external AI API wired yet (currently uses Lovable's Gemini gateway as placeholder)
- `kai_memories` table exists but no structured memory save/recall UI

Schema action needed:
- define a canonical KAI context object that aggregates all tables
- build an edge function or server-side aggregator that compiles this context
- wire to an external AI API (OpenAI, Anthropic, or similar) when ready
- `kai_memories` write UI so insights can be saved per company

## Phase 1 Outcome

Phase 1 is successful when:

- every CEO-visible concept has a clear source of truth
- the missing data concepts are explicitly modeled
- the founder dashboard can be rebuilt from real data contracts
- KAI has a structured, reliable context layer to read later
- the schema is ready to support employee, manager, and finance manager layers in Phase 2
