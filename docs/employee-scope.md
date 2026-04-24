# Employee / Team Member Scope

## Role Definition

An employee is any team member who belongs to one or more companies in the portfolio. They are added to the system by a manager, tech lead, or the CEO. Their primary function is to see what projects they are assigned to, track project progress across their team, and update their own task completion.

---

## Who Can Assign Employees To Projects

Any of the following roles can create a project and assign team members to it:

- **CEO** — can create and assign projects across any company
- **Manager / Team Lead** — can create and assign projects within their company or department
- **Tech Lead** — can create and assign projects, select members from their team

---

## What An Employee Can Do

### 1. My Projects Dashboard

The employee lands on a dashboard that shows all projects they have been added to.

Each project card shows:
- Project name
- Company it belongs to
- Department context (if set)
- Overall project completion percentage
- My assigned task(s) and their status
- Deadline
- Who created or assigned the project

### 2. Project Detail View

When an employee opens a project they can see:

- Full project description and context
- All team members on the project
- What task is assigned to each member
- Each member's task status and completion percentage (read-only for others)
- Overall project completion (derived from all member task percentages)
- Project deadline and created-by information
- Project-level updates or notes (if the lead adds any)

Employees can see other team members' progress on that project but cannot modify it.

### 3. Update My Own Tasks

Within a project, an employee can:

- Change their task status: not started / in progress / done
- Update their task completion percentage
- Add a short progress note to their task
- Mark their task as blocked and add a reason

They cannot edit other members' tasks.

### 4. My Profile

Employees can view their own profile:
- Name, role, department
- Reporting manager
- Which companies they are active in
- All projects they are currently assigned to

Profile is read-only for the employee. Changes are made by HR or the manager.

---

## What An Employee Cannot See

- Other employees' tasks outside projects they share
- Any company financials, burn, payroll, or ownership data
- KAI strategic insights or CEO-level summaries
- Department updates from departments they don't belong to
- Other employees' personal profile data (salary, performance notes)

---

## Notifications

When a new project is created and an employee is added to it, they receive:

### In-App Notification
- Appears on their dashboard immediately
- Shows: project name, who assigned them, their task title, deadline

### Email Notification
- Sent to their registered email
- Contains:
  - Project name and description
  - Who created/assigned the project
  - Their specific task or responsibility
  - Project deadline
  - Link to the project in the app

---

## Data Model — Projects

A "project" is a new first-class entity separate from the existing `tasks` table.

### Proposed `projects` Table

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `startup_id` | uuid | which company this belongs to |
| `title` | text | project name |
| `description` | text | what the project is about |
| `department_key` | text | optional — which department owns this |
| `status` | text | active / paused / completed / cancelled |
| `deadline` | date | when the project must be done |
| `created_by` | uuid | person_id or profile_id of creator |
| `overall_completion` | integer | derived from member task percentages |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### Proposed `project_members` Table

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `project_id` | uuid | FK → projects |
| `person_id` | uuid | FK → people |
| `role` | text | lead / member |
| `task_title` | text | what this person is responsible for |
| `task_description` | text | detailed breakdown of their part |
| `status` | text | not_started / in_progress / done / blocked |
| `completion_percentage` | integer | 0–100 |
| `progress_note` | text | latest update from this person |
| `blocked_reason` | text | if status is blocked |
| `assigned_at` | timestamp | |
| `updated_at` | timestamp | |

### Notification Records

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `recipient_person_id` | uuid | who the notification is for |
| `type` | text | project_assigned / task_updated / project_completed |
| `project_id` | uuid | FK → projects |
| `message` | text | human-readable notification text |
| `read` | boolean | whether the employee has seen it |
| `created_at` | timestamp | |

---

## Schema Actions Required

New tables to create:
- `projects`
- `project_members`
- `notifications`

The existing `tasks` table remains for CEO/manager-assigned individual tasks (priorities, follow-ups). Projects are a separate concept — they represent collaborative team work with shared visibility.

---

## Access Control (RLS)

- Employees can only read projects they are a member of
- Employees can only update their own row in `project_members`
- Employees cannot insert into `projects` or read projects they are not on
- Managers and CEO can read and write all projects for their companies
- Notification records are readable only by the recipient

---

## Employee UI Pages Required

| Page | Route | Purpose |
|---|---|---|
| Employee Dashboard | `/employee` | Project overview + my tasks |
| Project Detail | `/project/:id` | Full project breakdown + team progress |
| My Profile | `/profile` | Personal info, department, manager |

---

## Build Priority

This is Phase 2 work — the CEO layer is Phase 1. The employee experience begins after the core CEO command center and startup detail pages are stable.

Phase 2 implementation order:
1. Supabase migration: add `projects`, `project_members`, `notifications` tables
2. Employee Dashboard page
3. Project Detail page with team progress view
4. My task update flow (status + % + note)
5. In-app notification system
6. Email notification trigger (Supabase edge function or webhook)
