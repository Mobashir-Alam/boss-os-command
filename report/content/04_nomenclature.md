# NOMENCLATURE

This section lists the abbreviations, acronyms, and key terms used throughout the report.

**Abbreviations and acronyms**

| Term | Expansion / Meaning |
| API | Application Programming Interface |
| BaaS | Backend-as-a-Service |
| CRUD | Create, Read, Update, Delete |
| CSS | Cascading Style Sheets |
| ERD | Entity-Relationship Diagram |
| HTTP(S) | Hypertext Transfer Protocol (Secure) |
| IST | India Standard Time (Asia/Kolkata, UTC+05:30) |
| JSON | JavaScript Object Notation |
| JWT | JSON Web Token |
| KAI | The platform's AI assistant ("Knowledgeable AI") |
| KPI | Key Performance Indicator |
| LLM | Large Language Model |
| MFA | Multi-Factor Authentication |
| OAuth | Open Authorization (delegated-access protocol) |
| OTP | One-Time Password |
| PAT | Personal Access Token |
| PR | Pull Request |
| RAG | Retrieval-Augmented Generation |
| RBAC | Role-Based Access Control |
| RLS | Row-Level Security (PostgreSQL) |
| SaaS | Software-as-a-Service |
| SPA | Single-Page Application |
| SQL | Structured Query Language |
| UI / UX | User Interface / User Experience |
| UTC | Coordinated Universal Time |

**Domain-specific terms**

| Term | Meaning in this project |
| Connector | A subsystem that ingests data from one external service (GitHub, Slack, YouTube) |
| Work-day | A logical day for attendance, shifted by a boundary hour so night shifts stay whole |
| Backfill credit | Crediting a batched, late work update against the days it covers |
| Bus-factor risk | A repository whose contributions are concentrated in one person (key-person risk) |
| Snapshot | The grounded JSON summary of synced data passed to the LLM by a KAI function |
| Edge function | A serverless Deno function executed on Supabase infrastructure |
| Executive mode | An optional bold UI theme for connector dashboards (CEO-facing view) |
