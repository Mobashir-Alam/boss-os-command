# Founder / CEO MVP Scope

## In Scope

### 1. Portfolio Command Center

The CEO can see all companies in one place with:

- company name
- health status
- trend direction
- runway summary
- top risk
- top opportunity
- KAI summary

### 2. Company Drill-Down

The CEO can open a company and see:

- overview
- department updates
- people summary
- finances
- document repository
- ownership and funding
- KAI company insight

### 3. Department Update Layer

For each company, the CEO can see updates from:

- social media
- video production/editing
- content management
- studio
- tech
- creators/brands outreach
- HR
- graphic designing
- office management

Each department section should eventually show:

- current status
- wins
- blockers
- metrics or output signals
- owner or department lead
- KAI interpretation

### 4. People Summary

The CEO can see:

- department size
- active headcount
- reporting structure at summary level
- basic performance/efficiency indicators
- open hiring or staffing gaps

### 5. Financial Visibility

The CEO can see:

- cash left
- monthly burn
- runway
- high-level inflow/outflow summary
- key financial alerts
- linked supporting bills and expense documents

### 6. Document Visibility

The CEO can access company documents in a structured way, especially for review and verification.

Initial document categories should include:

- rental bills and rent agreements
- purchase bills and vendor invoices
- bank, tax, and finance support files
- legal and compliance company documents
- incorporation, registration, and policy documents
- contracts and key internal documents

For each document, the CEO should eventually be able to see:

- company
- category
- title or file name
- bill or document date
- uploaded by
- linked department where relevant
- linked expense or transaction where relevant
- storage link and preview metadata

### 7. Ownership And Funding Visibility

The CEO can see:

- who owns what stake
- current cap-table style summary
- funding rounds
- dilution or control risk signals

### 8. KAI Strategic Layer

KAI should provide:

- portfolio-level insight
- company-level insight
- department-aware interpretation
- founder/CEO suggestions
- top actions from a CEO perspective

## Core CEO Questions The MVP Must Answer

- Which company needs attention now?
- Which department is underperforming inside that company?
- What is the financial pressure there?
- Do we have the documents to support this spend or obligation?
- What is the ownership or fundraising context?
- What should I do next as CEO?

## Role Scope — All Four Roles

### Employee
The employee experience is a later phase but is in scope for the full product.

Employees need to:
- see their assigned tasks and projects
- update task and project completion status
- log daily or weekly work progress
- see their own profile and department

Employees cannot see:
- other employees' performance data
- company financials or ownership
- CEO-level KAI insights or strategic summaries

### Manager / Team Lead
The manager experience is a later phase but is in scope for the full product.

Managers need to:
- see all employees in their team or department
- view task and project progress per employee
- log department updates — wins, blockers, risks, asks
- see department-level summaries for their area only

Managers cannot see:
- CEO financial or ownership detail
- other departments' operational data
- KAI strategic layer

### Finance Manager
The finance manager experience is a later phase but is in scope for the full product.

Finance managers need to:
- enter and update salary and payroll per employee
- log expenses, vendor payments, and bills
- upload supporting financial documents linked to entries
- see a finance dashboard for their assigned companies

Finance managers cannot see:
- employee productivity or performance data
- ownership and cap table detail
- KAI or CEO strategic summaries

### KAI — CEO Only
KAI is exclusive to the CEO and is in scope across all phases.

KAI should:
- aggregate data from all levels — employees, managers, departments, finances, ownership
- pass this data to an external AI API
- return strategic insights for the CEO: business health, risk signals, market context, what to act on
- answer direct CEO questions about any company or the full portfolio
- grow smarter as more data is added across all roles

No other role has access to KAI.

## Out Of Scope Permanently

- autonomous AI workflows that modify business data on their own
- comprehensive board/report export flows
- external investor-facing portals

## MVP Pages

The founder-first MVP will stabilize these pages first:

- `FounderCommandCenter`
- `StartupDetail`
- `OwnershipEngine`
- `CfoDashboard`
- `PeopleOS`
- `DecisionLog`

## MVP Actions

The CEO should be able to:

- open a company
- review company and department signals
- inspect ownership and funding details
- inspect burn and runway
- inspect bills, invoices, rental records, and company documents
- read KAI suggestions
- log a decision
- assign or escalate a follow-up item later in the roadmap

## Product Shape

The product should feel like:

- portfolio-first at the top
- company-specific on drill-down
- department-aware inside each company
- financially and structurally literate
- AI-supported but data-grounded
