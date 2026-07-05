# CHAPTER 3: SYSTEM DESIGN AND METHODOLOGY

## 3.1 Architectural Overview

Founder OS follows a modern **three-tier, serverless** architecture. The presentation tier is a single-page application (SPA) that runs entirely in the browser; the logic and data tier is provided by Supabase, a managed backend-as-a-service that bundles a PostgreSQL database, an authentication service, file storage, a realtime engine, and a serverless function runtime; and the integration tier consists of the external service APIs (GitHub, Slack, YouTube, and an email provider) together with a hosted AI gateway. Figure 1 shows the overall arrangement and the principal data flows between these tiers.

![High-level system architecture of Founder OS, showing the browser SPA, the Supabase backend, the external APIs, and the AI gateway.](figures/architecture.png)

Two design decisions in this architecture are worth highlighting. First, **all third-party communication and all privileged database writes happen inside edge functions**, never in the browser. This keeps secrets (OAuth refresh tokens, bot tokens, personal access tokens, the AI gateway key) on the server and gives a single, auditable choke point for ingestion. Second, the browser reads data through Supabase's auto-generated REST interface, but every such read is filtered by Row-Level Security in the database, so the client is never trusted to enforce who may see what.

## 3.2 Technology Stack

The platform is implemented with the technologies listed in Table 2. The choices favour a fast, type-safe developer experience and a managed backend that minimises operational burden while still exposing low-level control (raw SQL migrations, serverless functions) where the project needs it.

Table: Technology stack of Founder OS
| Layer | Technology | Role in the project |
| Language | TypeScript | Type-safe application code across UI and edge functions |
| UI framework | React 18 | Component-based single-page application |
| Build tool | Vite | Fast dev server and production bundling |
| Styling | Tailwind CSS + shadcn/ui (Radix) | Utility-first styling and accessible component primitives |
| Server state | TanStack Query | Caching, invalidation, and synchronisation of server data |
| Routing | React Router | Client-side routing and route guards |
| Charts | Recharts | Data visualisation in dashboards |
| Forms | React Hook Form + Zod | Form state and schema validation |
| Backend | Supabase (PostgreSQL) | Database, auth, storage, realtime |
| Serverless | Deno edge functions | Ingestion, OAuth, AI, email, MFA (23 functions) |
| AI | Lovable AI Gateway (Gemini 3 Flash) | OpenAI-compatible LLM access for KAI |
| Testing | Vitest + Testing Library | Unit and component testing |
| Deployment | Lovable | Build, hosting, and function deployment |

## 3.3 Access-Control Design (RBAC + Row-Level Security)

Authorization is modelled with **Role-Based Access Control**. Every user has an application role stored on their profile, drawn from five values: `founder`, `mfo` (multi-function operator), `functional_head` (further qualified by a `department` such as `tech`, `social_media`, or `hr`), `project_manager`, and `team_member`. Roles determine both what a user sees and what a user may change.

Crucially, this model is enforced at **two layers**, as shown in Figure 2. In the browser, lightweight **route guards** (`AuthGuard`, `TechLeadGuard`, `HRGuard`, `SocialMediaGuard`) prevent unauthorised navigation and hide controls that the user may not use — this is a usability and defence-in-depth measure. The authoritative enforcement, however, lives in the database: every sensitive table has **Row-Level Security** policies whose `USING` and `WITH CHECK` clauses call `SECURITY DEFINER` helper functions such as `is_founder()`, `is_founder(uuid)`, `is_social_media_lead()`, and `has_role(uuid, app_role)`. Because these policies are evaluated by PostgreSQL itself against the authenticated user's identity (`auth.uid()`), an attacker who bypasses the UI and calls the data API directly still cannot read or write rows they are not entitled to.

![Two-layer access control: UI route guards for usability and PostgreSQL Row-Level Security policies for authoritative enforcement.](figures/rbac_rls.png)

This separation is a deliberate security posture: the front end is treated as untrusted, and correctness of authorization does not depend on it.

## 3.4 Data Model

The database schema is broad, reflecting the platform's many modules, but it is anchored by a small set of core entities and a uniform connector framework. The central entities are `startups` (the portfolio companies), `profiles` (users, carrying role, department, and cross-system identity fields such as `github_username`), and `user_roles`. Around these sit domain tables for projects, tasks, bugs, documents, departments, and the human-resources and finance modules.

The connector framework contributes a consistent set of tables — `connector_credentials` (one encrypted credential row per connector per startup), the raw data tables (`connector_data_github`, `connector_data_slack`, and the YouTube equivalents), a normalised `metrics` table, and an AI `kai_insights` feed. Figure 3 presents an entity-relationship view of the core domain together with the connector framework.

![Entity-relationship diagram of the core domain entities and the generic connector framework.](figures/er_core.png)

A few schema conventions recur throughout: every connector-owned table is keyed by `startup_id` (so the data is partitioned per company), raw payloads from external APIs are retained in a `jsonb` column for traceability and reprocessing, and uniqueness constraints (for example `UNIQUE (startup_id, record_type, external_id)`) make ingestion **idempotent** — re-running a sync updates existing rows rather than duplicating them.

## 3.5 The Connector Framework

Rather than implement each integration as a one-off, Founder OS defines a repeatable pipeline that every connector follows, illustrated in Figure 4. A sync is triggered (manually from a dashboard, by invoking the connector's edge function); the function loads the active credential for that startup and connector from `connector_credentials`; it calls the external API with appropriate pagination and rate-limit awareness; it normalises the response into uniform row shapes; it performs an **idempotent upsert** into the connector's raw table; it computes daily roll-up aggregates into a `*_daily` table for fast dashboard queries; and finally it records `last_synced_at`. Dashboards then read the normalised tables through Row-Level-Security-checked queries, and the KAI assistant reads the very same tables to build its snapshot.

![The generic connector ingestion pipeline shared by all connectors: load credential, fetch, normalise, idempotent upsert, roll up, and serve.](figures/connector_pipeline.png)

This uniformity is what makes the framework extensible: adding a new source (for example, Instagram) means writing one new sync function and a dashboard, while reusing the credential storage, the table conventions, the rollup pattern, and the KAI design.

## 3.6 The KAI AI Subsystem (Design)

Each connector is paired with a KAI question-answering function (`github-kai-ask`, `slack-kai-ask`, `youtube-kai-ask`) and there are platform-level functions (`kai-ask`, `kai-predict`) for broader insight generation. The design goal is **grounded** answering: the assistant must never invent numbers. Each function therefore (i) reads the full relevant synced history from the database, (ii) deterministically aggregates it into a compact JSON **snapshot** (per-person and per-repository/channel breakdowns, totals, and momentum deltas), and (iii) sends that snapshot, together with a system prompt containing strict grounding rules, to the Lovable AI gateway. The model's answer is thus constrained to the organisation's own data. The detailed request flow is given in Chapter 4 (Figure 8).

## 3.7 Development Methodology

The project was developed iteratively using the Lovable platform in conjunction with Supabase. Schema changes are expressed as versioned **SQL migrations** (the repository contains roughly seventy-five migration files), giving a reproducible, auditable history of the database. Server behaviour is encapsulated in independently deployable **edge functions**. Each feature was built in a vertical slice — migration, edge function, data-access hook, and UI — and validated end to end against real connected accounts before moving on. Type safety (TypeScript end to end, generated database types) and component tests (Vitest) provide a baseline of correctness, while the iterative loop kept the system continuously demonstrable. This methodology suited a solo developer building a broad platform: it favoured working software at every step over big-design-up-front, while the migration history and RLS policies kept the foundations disciplined.
