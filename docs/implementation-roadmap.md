# Implementation Roadmap

## Phase 0

Lock the CEO / founder product definition based on the current UI direction and the clarified business idea.

Deliverables:

- product brief
- founder scope
- user flows
- domain model notes
- KAI strategy
- document management spec

## Phase 1

Translate CEO product definition into a clean data model and implementation map.

Focus:

- review current tables against CEO needs
- define company-department-update model
- define document model for bills, invoices, rental records, and company files
- define founder overview data contract
- identify which current UI sections are live vs static

Deliverables:

- phase 1 schema gap analysis
- founder data contract
- phase 1 migration spec
- recommended first migration batch
- first founder data-layer priorities

## Phase 2

Stabilize the CEO command center around real data.

Focus:

- portfolio health
- company cards
- execution summary
- finance summary
- people summary
- KAI summary placeholders backed by real data inputs

## Phase 3

Stabilize company drill-down.

Focus:

- department updates
- people summary
- finances
- milestones, notes, documents
- document categorization and company-level document repository
- ownership drill-down entry point

## Phase 4

Integrate the first production KAI flows for CEO.

Focus:

- portfolio brief
- company brief
- CEO suggestions
- structured output

## Phase 5

Expand into richer actions and role-ready architecture.

Focus:

- decisions
- escalations
- founder actions
- future-ready access control and lower-role rollout

## UI Workflow Note

This repo is also connected to Lovable. For future UI creation or redesign work, the workflow should be:

- define product and data requirements here first
- then generate a high-quality Lovable prompt for the user to run
- only implement local code UI directly when explicitly requested
