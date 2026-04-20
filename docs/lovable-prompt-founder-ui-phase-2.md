# Lovable Prompt - Founder / CEO UI Phase 2

Use this prompt in Lovable for the next founder-first UI pass.

---

You are redesigning and upgrading the UI for an existing React + TypeScript + Supabase founder/CEO operating system.

Important:

- This is not a greenfield app
- Do not invent a totally different product
- Preserve the current founder-first information architecture
- Improve the UI so it feels premium, executive, focused, and intentional
- Avoid generic dashboard slop
- Avoid purple-heavy defaults
- Avoid overly playful startup-template visuals
- The visual language should feel like a calm, high-signal command center for a CEO managing multiple companies

## Product Context

This app is for a founder / CEO who manages multiple companies.

The founder needs to:

- see all companies in one place
- understand company health quickly
- inspect five key departments inside each company
- review finance and runway
- inspect ownership and funding context
- review company documents like rental bills, purchase bills, invoices, legal files, and company records
- read strategic AI summaries from KAI

Current core founder departments:

- social media
- video production/editing
- content management
- studio
- tech
- creators/brands outreach
- HR
- graphic designing
- office management

## Current Backend/Data Reality

The backend is already connected to Supabase and now includes:

- startups
- people
- tasks
- priorities
- financial_entries
- burn_categories
- cash_flow_entries
- financial_forecasts
- stakeholders
- funding_rounds
- board_seats
- special_rights
- startup_documents
- startup_departments
- department_updates
- startup_notes
- startup_milestones
- kai_memories

The UI should be designed to support these real data shapes. Do not design fake modules that do not map to this system.

## Primary UI Goals

Redesign these founder-facing surfaces:

1. Founder Command Center
2. Startup Detail page
3. Company document repository experience inside startup detail
4. Department command layer inside startup detail

## Founder Command Center Requirements

The founder command center should feel like a premium CEO briefing console.

It should include these zones:

### 1. Header / Executive Bar

- founder page title
- concise portfolio status line
- current mode switch if useful, but make it more refined than the current implementation

### 2. KAI Strategic Brief

Design a top-level hero or briefing panel that can show:

- biggest risk
- biggest opportunity
- top decisions
- founder focus

This should feel like the most important block on the page, but not oversized or noisy.

### 3. Portfolio Health Grid

Each company card should feel executive-grade and compact.

Each card should support:

- company name
- health state
- trend
- runway
- top risk
- a compact sparkline or trend strip
- a small signal badge if relevant

### 4. Department-Aware Intelligence

Create a founder-friendly summary section that shows cross-company departmental health.

Example:

- tech delivery risk across companies
- social media momentum
- video production bottlenecks
- creators/brands outreach gaps
- HR hiring or performance gaps
- design/studio coordination pressure

Keep it compact and strategic.

### 5. Finance + People + Ownership Summary

Make these look more premium and meaningful than basic cards.

They should feel connected to CEO decision-making, not just dashboard widgets.

### 6. Founder Decisions / Capital Allocation / Pattern Signals

These should be styled as strategic aids, not generic list boxes.

## Startup Detail Page Requirements

The startup detail page should feel like a company command room for one portfolio company.

It should support:

- clear company header
- health summary
- current strategic status
- department command layer
- finance section
- document repository section
- ownership entry point
- KAI company intelligence

### Startup Header

Include:

- startup name
- status
- a concise strategic line
- executive actions

### Department Command Layer

This is one of the most important new sections.

Design a strong department panel that shows the five company departments:

- social media
- video production/editing
- content management
- studio
- tech
- creators/brands outreach
- HR
- graphic designing
- office management

Each department card should support:

- status
- headcount
- department lead
- latest summary
- top blocker if any
- latest update date

This section should feel like a department operations radar for the founder.

### Document Repository UX

Design the document area as a business document repository, not a generic file list.

The founder should be able to understand that the repository includes:

- rental bills
- purchase bills
- vendor invoices
- legal files
- compliance files
- company records
- internal documents

The UI should support:

- category chips or grouped categories
- recent documents
- date visibility
- clean file rows
- a premium, minimal business feel

### Finance Area

The finance section should feel more CEO-friendly than a back-office tool.

It should clearly communicate:

- burn
- revenue
- cash flow
- runway
- risk level

### Ownership And Funding

The UI should make it very natural for the founder to move from company overview to ownership / dilution / funding context.

## Design Direction

Visual direction:

- elegant
- editorial
- strategic
- restrained but premium
- business-grade

Avoid:

- flat generic admin dashboard style
- playful SaaS marketing visuals
- purple on white default themes
- overuse of gradients
- cluttered KPI tiles everywhere

Use:

- strong layout hierarchy
- premium card surfaces
- intelligent spacing
- subtle section framing
- expressive but professional typography
- muted neutrals with carefully chosen accent colors

## UX Constraints

- desktop-first but responsive
- do not overload the founder with too many equal-weight cards
- emphasize hierarchy and attention
- make the most important information obvious in 5 seconds
- preserve realistic implementation boundaries for React + Tailwind + shadcn style components

## Output Request

Generate a UI redesign for:

- founder command center
- startup detail page
- department updates section
- document repository section

The result should feel like a cohesive CEO operating system, not a collection of unrelated widgets.

If you need to choose where to spend design effort, prioritize:

1. founder command center hierarchy
2. startup detail executive layout
3. department command layer
4. document repository polish

Keep the design implementation-friendly for the current repo.
