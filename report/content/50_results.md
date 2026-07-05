# CHAPTER 5: RESULTS AND DISCUSSION

## 5.1 Overview of the Delivered System

The project delivers a working, deployed web platform that meets the objectives set out in Section 1.3. A user signs in, passes email one-time-password verification, and is presented with navigation and dashboards appropriate to their role. The three connectors ingest live data from GitHub, Slack, and YouTube into the unified schema, the dashboards render that data with key-performance-indicator tiles and charts, and the KAI assistant answers natural-language questions grounded in the synced data. This section discusses what each part delivers, summarises operational observations, and evaluates the system against the alternatives surveyed in Chapter 2. Figures 10 to 15 are screenshots of the running application.

> Note: the screenshots referenced below are to be captured from the running application and placed in the `report/figures/` directory using the file names shown; until then the build inserts a labelled placeholder for each.

## 5.2 Module-by-Module Results

**Founder Command Center.** The landing surface for the founder consolidates portfolio-wide signals and priorities, giving the cross-startup view that previously required visiting several tools (Figure 10).

![Screenshot: the Founder Command Center showing the portfolio-wide overview.](figures/screenshot_founder.png)

**Engineering — GitHub.** The engineering dashboard answers, in one place, who is working on which repository, how many commits and pull requests they have produced, and where key-person risk lies. It provides overview KPIs, per-person and per-repository breakdowns, an in-flight pull-request view, a filterable commits panel, and identity mapping (Figure 11).

![Screenshot: the GitHub engineering dashboard with contribution and risk views.](figures/screenshot_github.png)

**Slack — Team Ops.** The accountability board shows, for the current work-day, who has checked in, who is active but has not checked in, who is absent, and who has not posted a work update, along with a monthly attendance sheet. The work-day boundary logic correctly keeps overnight shifts intact (Figure 12).

![Screenshot: the Slack "Today" accountability board.](figures/screenshot_slack.png)

**Social Media — YouTube.** The content dashboard presents channel and video performance, audience geography and demographics, and retention curves across the connected channels (Figure 13).

![Screenshot: the YouTube analytics overview.](figures/screenshot_youtube.png)

**KAI assistant.** Each connector's "Ask KAI" tab answers free-text questions — for example, "who shipped the most this week?" or "which pull requests are stuck?" — citing figures only from the synced snapshot (Figure 14).

![Screenshot: KAI answering a natural-language question grounded in the data.](figures/screenshot_kai.png)

**Executive mode.** The optional executive re-skin renders the same dashboards in a bold, presentation-oriented theme for chief-executive review (Figure 15).

![Screenshot: a connector dashboard in Executive ("CEO View") mode.](figures/screenshot_exec.png)

## 5.3 Operational Observations

Several qualitative results emerged from running the connectors against real accounts:

- **Idempotency holds.** Repeated syncs converge on the same data rather than duplicating it, owing to the natural-key upserts; this makes the manual "Sync" button safe to press at any time.
- **Graceful degradation under limits.** The GitHub connector's rate-limit and time-budget handling allows large multi-organisation accounts (tens of repositories across two organisations) to be synced incrementally, covering the most active repositories first and reporting partial runs honestly.
- **Correct temporal semantics.** The Slack work-day boundary resolves the night-shift problem: a shift that crosses midnight is recorded against a single work-day, and the "Today" board rolls over at the configured boundary hour by the wall clock rather than waiting for new messages.
- **Grounded answers.** Because KAI is constrained to a deterministic snapshot, its answers track the dashboard figures; the principal constraint on answer quality is sync depth, not the model.

Table 5 maps the project objectives to their delivered outcomes.

Table: Objectives versus delivered outcomes
| Objective (Section 1.3) | Outcome |
| Unified, role-aware multi-startup dashboard | Delivered — 27 routes, five roles, role-based navigation |
| Generic connector framework | Delivered — shared credentials, tables, rollups, and pattern |
| Three end-to-end connectors | Delivered — YouTube (OAuth), Slack (attendance), GitHub (eng) |
| RBAC enforced in UI and database | Delivered — route guards + PostgreSQL RLS policies |
| Grounded AI assistant | Delivered — per-connector KAI over a snapshot |
| MFA and operational concerns | Delivered — email OTP MFA, email queue, notifications |

## 5.4 Evaluation against Existing Systems

Measured against the comparison in Table 1, Founder OS occupies a position that none of the surveyed categories occupy alone. Unlike general business-intelligence tools, it is role-aware and requires no data-modelling effort before it is useful; unlike single-domain analytics products, it spans engineering, communication, and content in one surface; unlike the native dashboards of the source tools, it offers a cross-startup portfolio view and database-level authorization; and unlike a bolt-on chatbot, its AI assistant is grounded per-connector in the organisation's own data. The trade-off for this integration is breadth over depth: a dedicated tool will always offer more specialised analysis within its niche, whereas Founder OS optimises for a unified, decision-ready overview.

## 5.5 Limitations

The honest limitations of the current system are: analytical depth is bounded by sync depth; KAI uses a general-purpose hosted model over a JSON snapshot rather than a vector-database retrieval pipeline, which is adequate at the present data scale but would need revisiting at much larger volumes; per-message enrichment in Slack (for example, reaction counts) depends on the granted API scopes; and the deployment is currently single-tenant even though the schema is multi-startup. These are addressed as future work in Chapter 6.
