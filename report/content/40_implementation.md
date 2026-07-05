# CHAPTER 4: IMPLEMENTATION

This chapter describes how the system was built. It begins with an overview of the modules, then presents the connector framework in code, followed by detailed treatments of the three connectors and the KAI assistant, the security mechanisms, and a user-experience highlight. Representative pseudo-code is given for the most significant algorithms.

## 4.1 Module Catalogue

The application is organised into page-level dashboards, each guarded by the access-control model of Section 3.3, and a set of serverless edge functions that perform all privileged work. The application comprises twenty-seven page-level routes; Table 3 lists a representative selection grouped by audience, and Table 4 catalogues the twenty-three edge functions by purpose.

Table: Representative page-level dashboards and their primary audience
| Module / Route | Primary audience | Purpose |
| Founder Command Center | Founder | Portfolio-wide health and priorities at a glance |
| Portfolio / Startup Detail | Founder, MFO | Per-startup deep view (finance, team, documents) |
| Project Board / Project Detail | Project managers | Projects, tasks, bugs, discussion |
| Functional Head / Department | Functional heads | Department status and updates |
| HR Dashboard | HR lead, founder | Attendance, leave, payroll, reviews, hiring |
| Finance (CFO) Dashboard | Founder, finance | Financial entries and funding |
| Social Media (YouTube) | Social-media lead, founder | YouTube analytics connector dashboard |
| Slack — Team Ops | Social-media lead, founder | Attendance and work-update accountability |
| Engineering — GitHub | Tech lead, founder | Commits, PRs, focus, and key-person risk |
| Profile / Inbox / Login / Verify 2FA | All users | Identity, notifications, authentication |

Table: Edge functions grouped by purpose
| Group | Functions | Responsibility |
| Connector sync | connector-sync, github-sync, slack-sync, youtube-sync, youtube-analytics-sync | Ingest and normalise external data |
| Connector discovery | github-discovery, youtube-discovery | Read-only scans (orgs/repos, channels) for setup |
| OAuth | youtube-oauth-start, youtube-oauth-callback | OAuth 2.0 authorization-code flow |
| Presence | slack-presence | Live "who is online" lookup |
| AI (KAI) | kai-ask, kai-predict, github-kai-ask, slack-kai-ask, youtube-kai-ask | Grounded Q&A and insight generation |
| Authentication | send-mfa-code, verify-mfa-code | Email one-time-password MFA |
| Email | send-transactional-email, process-email-queue, preview-transactional-email, handle-email-suppression, handle-email-unsubscribe | Transactional email pipeline |
| Reporting | weekly-tech-digest | Scheduled engineering digest |

## 4.2 The Connector Framework in Code

Credentials for every integration are stored in a single table, `connector_credentials`, with a `jsonb` `credentials` column that holds whatever each connector needs (an OAuth refresh token, a Slack bot token, or a GitHub personal access token plus a list of organisations). The table is protected so that only a founder may write credentials, while the sync functions read them using the service role. Ingestion is made **idempotent** by upserting against a natural key, so repeated syncs converge rather than duplicate. The pattern, common to every connector, is:

```
function syncConnector(startup_id, connector_type):
    cred = SELECT credentials FROM connector_credentials
           WHERE startup_id = $1 AND connector_type = $2 AND is_active
    if not cred: return 404 "no active credential"

    records = []
    for page in fetchExternalAPI(cred, window, rateLimitAware = true):
        records += normalise(page)        # uniform row shape

    UPSERT INTO connector_data_<type> (records)
        ON CONFLICT (startup_id, <natural key>) DO UPDATE

    rollUpDaily(startup_id)               # aggregate into *_daily
    UPDATE connector_credentials SET last_synced_at = now()
    return counts
```

An important practical detail is that PostgREST's bulk upsert requires every row in a batch to have the **same set of keys**; mixed-shape records (for example, commits without a `merged_at` field alongside pull requests that have one) must be padded to a uniform shape, a lesson applied throughout the GitHub connector.

## 4.3 YouTube Connector

The YouTube connector is the most authentication-rich of the three because it acts on a user's Google account through the **OAuth 2.0 authorization-code grant**. Figure 5 traces the full flow. The user starts the connection from the Social-Media dashboard; `youtube-oauth-start` returns a Google consent URL carrying the requested scopes and an anti-forgery `state` value; after the user grants access, Google redirects to `youtube-oauth-callback`, which exchanges the authorization code for an access token and a long-lived refresh token and stores them in `connector_credentials`. Thereafter, `youtube-sync` and `youtube-analytics-sync` use the refresh token to obtain fresh access tokens and query the YouTube Data and Analytics APIs.

![YouTube connector: OAuth 2.0 authorization-code flow followed by analytics synchronisation.](figures/youtube_oauth.png)

Data is ingested in tiers: a **data tier** (channels and their videos), an **analytics tier** (views, watch-time, and engagement over time), and a **tier-2** layer (audience geography and demographics, and per-video retention curves). The dashboard presents these through tabs — overview, audience, retention, content lab, and an "Ask KAI" tab — with KPI tiles and Recharts visualisations. Channel-level filtering and pagination keep the views responsive when a startup owns several channels.

## 4.4 Slack Accountability Connector

The Slack connector was deliberately reframed from a generic message-analytics tool into a **team-accountability system** answering three operational questions: who is at work now, who has not posted attendance, and who has not given a work update. Two design problems made this non-trivial.

**Problem 1 — night shifts must not split at midnight.** Different team members work different hours, some overnight. A naive calendar-day bucket would split a single night shift across two days. The connector therefore computes a logical **work-day** by converting each message's timestamp to the configured local time zone (Asia/Kolkata) and shifting by a configurable **boundary hour**: any activity before the boundary rolls into the previous calendar day. Figure 6 shows the bucketing and classification logic, and the algorithm is:

```
function localWorkDate(ts_seconds, timeZone, boundaryHour):
    (y, m, d, hour) = localParts(ts_seconds, timeZone)   # via Intl.DateTimeFormat
    base = UTC_date(y, m, d)
    if hour < boundaryHour:
        base = base - 1 day          # before boundary -> previous work-day
    return base as YYYY-MM-DD
```

![Slack work-day bucketing: a configurable boundary hour keeps night shifts whole, then each message is classified as check-in, work update, or activity.](figures/slack_workday.png)

A message is classified by channel: the first message of a work-day in the designated **attendance channel** marks a check-in; a message in any channel whose name ends with the configured **work-update suffix** marks a work update; any other message marks generic activity. Results are upserted into `slack_daily_attendance`, keyed by `(startup_id, user, work_date)`. The "Today" board reads the *current* work-day computed from the wall clock, so the board rolls over automatically at the boundary hour rather than waiting for new data.

**Problem 2 — batched and self-reported updates.** People often post several days of updates at once, or write attendance for past days in a single message. The connector handles batched updates with **backfill credit** (a late update is credited against the days it covers, up to a configurable cap, shown in an amber "caught up" state) and parses free-text bulk check-ins with the AI assistant, flagging them distinctly as *self-reported* so they are not confused with live check-ins. A monthly attendance sheet aggregates the per-day records across the team.

## 4.5 GitHub Engineering Connector

The GitHub connector gives engineering leadership and the founder a clear picture of who is working on what, how much, and where the risk is. It synchronises across **multiple organisations** using a personal access token, as shown in Figure 7. For each organisation it lists repositories most-recently-pushed first, skips archived or inactive ones, and for each active repository fetches commits within the window and open and merged pull requests, paginating defensively.

![GitHub multi-organisation engineering sync, with identity mapping, daily roll-ups, a repository registry, and graceful early stop on rate-limit or time-budget exhaustion.](figures/github_sync.png)

Three engineering concerns shaped the implementation. **Identity** — raw GitHub handles are mapped to employees via `profiles.github_username`, with the raw handle shown as a fallback and a mapping dialog provided to link the rest. **Bot noise** — automated authors (`[bot]`, `dependabot`, `github-actions`, `web-flow`) are filtered so they do not pollute per-person statistics. **Resource limits** — the GitHub API permits 5,000 requests per hour per token, so the function watches `X-RateLimit-Remaining` and enforces an internal time budget, stopping gracefully with the most-active repositories already covered and reporting whether the run was partial. Commits and pull requests are upserted into `connector_data_github`, aggregated into `connector_data_github_daily`, and the full repository inventory (including dormant and archived repositories) is recorded in `connector_data_github_repos`. The dashboard then surfaces overview KPIs, a per-person view, a per-repository view with a **bus-factor risk** flag (a repository whose commits are dominated by a single contributor), a "focus / right now" view of in-flight pull requests, and a filterable commits panel.

## 4.6 KAI — Grounded Natural-Language Assistant

KAI lets any authorised user ask plain-English questions of a connector's data and receive an answer cited only from that data. Figure 8 shows the request flow for the GitHub assistant (`github-kai-ask`); the Slack and YouTube assistants follow the same pattern over their respective tables.

![KAI grounded question-answering: the edge function reads synced data, builds a deterministic snapshot, and queries the AI gateway with strict grounding rules.](figures/kai_flow.png)

When invoked with a `startup_id` and a `question`, the function reads the full synced history (for GitHub, 180 days of daily roll-ups plus the repository registry and all open pull requests), then deterministically builds a compact JSON **snapshot**: per-person totals (commits, pull requests opened and merged, repositories touched, last-active date), per-repository contributor breakdowns with a bus-factor flag, full-window and last-seven-day totals, and seven-day-versus-prior-seven-day momentum deltas. The snapshot and a **system prompt** of grounding rules are sent to the Lovable AI gateway (an OpenAI-compatible endpoint proxying `google/gemini-3-flash-preview`). The grounding rules are explicit, for example:

```
- Only cite numbers present in the snapshot. Never invent data.
- Answer for two audiences: an engineering lead (load balance,
  who is blocked, stuck PRs) and the CEO (are we shipping, is
  everyone contributing, risk).
- Flag risk concretely: stale open PRs, bus_factor_risk repos,
  contributors with little recent activity, sharp momentum drops.
- Commits reflect default-branch activity; do not over-read raw
  counts as productivity.
```

The function maps rate-limit (HTTP 429) and credit-exhaustion (HTTP 402) responses to friendly messages and returns the model's markdown answer. Because the model only ever sees the organisation's own aggregated data and is instructed to cite nothing else, the assistant is suitable for operational reporting. This is a lightweight, auditable application of the retrieval-augmented-generation principle discussed in Section 2.5: retrieval is a deterministic database query, and the "documents" are a structured snapshot.

## 4.7 Authentication and Multi-Factor Security

Authentication is built on Supabase Auth (email and password, issuing JWT sessions) and hardened with **email one-time-password multi-factor authentication**. Figure 9 shows the flow: after a successful password sign-in, `send-mfa-code` generates a time-limited six-digit code, stores it (hashed, with an expiry and attempt counter), and emails it to the user; the `Verify2FA` page collects the code and `verify-mfa-code` validates it before access is granted. Combined with the Row-Level Security model of Section 3.3, this gives the platform layered protection: something the user knows (password), something the user receives (OTP), and database-enforced authorization on every row.

![Authentication with email one-time-password multi-factor verification.](figures/mfa_flow.png)

## 4.8 User-Experience Highlight: Executive Mode

A distinguishing UX feature is **Executive ("CEO View") mode**, a one-click bold re-skin of the three connector dashboards intended for executive presentation. It is implemented elegantly as a token-swap: a React context flips a persisted flag, and a scoped CSS class redefines the design-system colour tokens (a red/gold/black palette) together with an animated backdrop and entrance animations. Because every component is built on these CSS variables, the entire dashboard re-skins automatically without touching component code. A global rescue rule remaps the handful of components that hardcode light colours so they remain legible on the dark canvas. The feature demonstrates the value of a disciplined, token-driven design system.

## 4.9 A Note on Diagrams

As Founder OS is a software system, this report contains data-flow diagrams, sequence diagrams, an entity-relationship diagram, and architectural block diagrams in place of the hardware schematics or circuit diagrams that a hardware project would include; there is no hardware component in this project. The pseudo-code listings above capture the algorithmic core of the most significant routines, and selected source-level excerpts are reproduced in the Appendix.
