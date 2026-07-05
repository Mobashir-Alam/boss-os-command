# CHAPTER 2: LITERATURE REVIEW

This chapter surveys the bodies of work and the existing systems that are relevant to Founder OS, organised by theme, and concludes with a gap analysis that positions the project against the state of the art.

## 2.1 Business-Intelligence Dashboards and Operational Analytics

The discipline of presenting operational data for decision-making is well established. Few [1], in his foundational treatment of information-dashboard design, defines a dashboard as a visual display of the most important information needed to achieve objectives, consolidated on a single screen so it can be monitored at a glance, and catalogues the common design failures that reduce a dashboard's effectiveness. These principles — single-surface consolidation, appropriate visual encoding, and minimisation of non-data ink — directly inform the dashboard layouts used throughout this project.

Commercial business-intelligence (BI) platforms such as Tableau, Microsoft Power BI, and Looker generalise this idea: they connect to data sources, model the data, and let analysts compose interactive visualisations. They are powerful but general-purpose; they assume a data team to model the sources and build the reports, they are priced for enterprises, and they are not opinionated about a specific operational domain or organisational role structure. Founder OS takes the opposite stance — it is purpose-built and role-aware, trading generality for an out-of-the-box, domain-specific experience that a non-analyst founder can use immediately.

## 2.2 Engineering-Productivity and Team Analytics

Measuring software-delivery performance is an active area. Forsgren, Humble, and Kim [2], in *Accelerate*, present the research behind the now-widely-adopted DORA metrics (deployment frequency, lead time for changes, change-failure rate, and time to restore service) and argue, with statistical backing, that delivery performance predicts organisational performance. A recurring caution in this literature is that naive activity counts — lines of code, raw commit counts — are poor proxies for productivity and can incentivise the wrong behaviour. Commercial tools such as LinearB, Swarmia, and GitHub's own Insights operationalise these ideas for engineering managers.

The GitHub connector in this project is informed by these lessons: it surfaces contribution distribution and key-person ("bus-factor") risk rather than ranking individuals by raw output, and it explicitly annotates that commit counts reflect default-branch activity and should not be over-read — a nuance also passed to the AI assistant as a grounding rule.

## 2.3 Access Control and Database-Level Security

Role-Based Access Control (RBAC) is the canonical model for managing authorization in multi-user systems. Sandhu, Coyne, Feinstein, and Youman [3] formalised the family of RBAC reference models, in which permissions are associated with roles and users acquire permissions by being assigned to roles, greatly simplifying administration compared with per-user access lists. Founder OS adopts RBAC with five application roles.

A common weakness in web applications is enforcing authorization only in application code, where it can be bypassed if the client talks to the data layer directly. PostgreSQL's **Row-Level Security** (RLS) [4] addresses this by attaching security policies to tables, so that the database itself restricts which rows a given user may read or modify, regardless of the query's origin. The Supabase platform [5] builds its access model on exactly this primitive, exposing the authenticated user's identity to policies. This project therefore enforces RBAC authoritatively inside the database through RLS policies backed by `SECURITY DEFINER` helper functions, with the user interface guards acting only as a usability layer.

## 2.4 Third-Party Integration and Delegated Authorization

Aggregating data from external services requires a secure way to act on a user's behalf. The **OAuth 2.0 Authorization Framework** [6] is the industry standard for delegated authorization; its authorization-code grant lets an application obtain a scoped access token (and a refresh token for long-lived access) without ever handling the user's credentials. The YouTube connector implements this grant directly. For services where a long-lived secret is appropriate, the project uses bot tokens (Slack) and personal access tokens (GitHub), each stored server-side and never exposed to the browser — a separation enabled by running all ingestion inside serverless **edge functions** rather than in the client.

## 2.5 Large-Language-Model Assistants over Private Data

The transformer architecture introduced by Vaswani et al. [7] underpins modern large language models (LLMs), which can answer questions and summarise text fluently. Their central weakness for analytics use is *hallucination* — confidently stating facts that are not true. Lewis et al. [8] proposed **Retrieval-Augmented Generation (RAG)**, in which a model is conditioned on documents retrieved from an external knowledge source at inference time, substantially improving factual accuracy on knowledge-intensive tasks. The general principle — *ground the model in authoritative source data and instruct it to cite only that data* — is what makes an LLM trustworthy for operational reporting.

The KAI subsystem applies this principle in a form suited to its data scale: rather than a vector store, each KAI function deterministically constructs a compact, complete JSON **snapshot** of the relevant synced data and supplies it to the model along with strict instructions to use only the numbers present in the snapshot. This is a lightweight, auditable variant of grounded generation appropriate for structured operational data.

## 2.6 Gap Analysis

The reviewed work establishes the building blocks — dashboards, delivery metrics, RBAC, RLS, OAuth, and grounded LLMs — but each addresses only one facet. General BI tools are unaware of roles and require modelling effort; engineering-analytics tools cover only engineering; communication and content analytics live in their own products; and LLM assistants are typically bolted onto a single source. Table 1 summarises the comparison.

Table: Comparison of Founder OS with representative existing systems
| Capability | General BI (Tableau / Power BI) | Eng-analytics (LinearB / GH Insights) | Native tool dashboards (Slack / YT) | Founder OS |
| Cross-tool consolidation | Yes (with modelling) | No | No | Yes |
| Role-aware presentation | No | Partial | No | Yes (5 roles, RLS-enforced) |
| Database-level authorization | N/A | N/A | N/A | Yes (PostgreSQL RLS) |
| Multi-startup portfolio view | Possible | No | No | Yes (native) |
| Built-in grounded AI Q&A | Limited / add-on | Emerging | No | Yes (per connector) |
| Out-of-the-box, no data team | No | Yes | Yes | Yes |
| Extensible connector framework | Via connectors | No | No | Yes |

The gap Founder OS fills is the combination of all of these in a single, role-aware, multi-startup platform that a non-specialist can operate, with grounded AI assistance layered over every data source. The remaining chapters detail how this combination is designed and implemented.
