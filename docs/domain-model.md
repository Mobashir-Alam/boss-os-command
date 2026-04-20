# Domain Model Notes

## Core Product Entities For CEO Scope

### Organization

Represents the founder's umbrella operating environment that owns multiple companies.

### Startup / Company

Represents one company inside the portfolio.

CEO needs to see for each company:

- health
- trend
- top issues
- department summaries
- finance position
- ownership and funding context

### Department

For CEO MVP, each company has these departments:

- social media
- video production/editing
- content management
- studio
- tech
- creators/brands outreach
- HR
- graphic designing
- office management

Department records should support:

- department lead
- summary status
- update stream
- member count
- KPI or output summary
- blockers

### Department Members / People

Each department may have multiple people. In the rough model, a company may have around 10 members per department.

CEO does not need full task-level detail for every person at first, but does need:

- total headcount
- active members
- team efficiency indicators
- who leads the department

### Department Updates

This is a critical entity for the CEO view.

Each update should eventually include:

- company
- department
- date
- summary
- wins
- blockers
- asks or risks
- owner

### Financial Snapshot

Represents the current financial state of a company:

- cash left
- burn
- runway
- revenue or inflow context
- forecast signals

### Document

Represents a file or record the CEO may need for financial, operational, legal, or compliance visibility.

Priority document types for CEO MVP:

- rental bills
- rent agreements
- purchase bills
- vendor invoices
- financial proofs and supporting files
- legal and compliance documents
- incorporation and company documents
- contracts and internal company records

Each document should eventually support:

- company
- document category
- subcategory
- file name
- storage URL
- issue date or bill date
- amount where relevant
- vendor or counterparty where relevant
- linked department where relevant
- linked expense, financial entry, or funding round where relevant
- uploaded by
- created date
- tags

### Document Category

Useful for CEO filtering and reporting.

Suggested top-level categories:

- finance
- legal
- compliance
- operations
- HR
- vendor

Suggested financial subcategories:

- rent
- purchase
- invoice
- reimbursement
- tax
- banking

### Funding Round

Represents each historical or planned funding round:

- round name
- amount
- valuation
- order
- notes

### Stakeholder / Ownership

Represents who owns what in a company:

- founder or stakeholder name
- role
- equity percentage
- voting percentage
- vesting info
- rights where relevant

### KAI Insight

Represents AI-generated interpretation, not source-of-truth raw data.

For CEO MVP KAI should summarize:

- portfolio health
- company risk and opportunity
- department-level cause and effect
- CEO suggestions

## Current Repo Alignment

The existing Supabase schema already contains many useful foundations:

- `startups`
- `people`
- `tasks`
- `financial_entries`
- `financial_forecasts`
- `funding_rounds`
- `stakeholders`
- `board_seats`
- `burn_categories`
- `cash_flow_entries`
- `startup_notes`
- `startup_documents`
- `startup_milestones`
- `kai_memories`

## Gaps To Solve In Later Phases

Based on the CEO vision, the largest structural gap is a clean department update model. The current repo has people, tasks, and startup-level records, but the CEO story needs a more explicit department-summary layer so the founder can inspect one company by functional area without diving into raw operational noise.

Document handling also needs to become more structured. The current `startup_documents` table gives us a starting point, but CEO workflows will likely need richer metadata so bills, invoices, legal records, and company files can be filtered and tied back to finance and department context.

Likely additions later:

- `departments`
- `startup_departments`
- `department_updates`
- `department_metrics`
- maybe `department_memberships`
- richer document metadata on top of `startup_documents`
- maybe `document_categories`
- maybe links from documents to `financial_entries` or vendor records

## Product Rule

KAI should never be the source of business truth. KAI reads company, department, finance, and ownership data and then interprets it for the CEO.
