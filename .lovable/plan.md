

## Plan: Startup Actions Hub

Transform the startup detail page into a full management center with 7 action sections, accessible via a tab bar at the top.

### Database Changes (Migration)

1. **`kai_memories` table** — `id`, `startup_id` (uuid), `memory` (text), `category` (text: preference/target/context), `created_by` (uuid), `created_at`. RLS: all authenticated can read, founders/MFOs can manage.

2. **`startup_notes` table** — `id`, `startup_id` (uuid), `content` (text), `author_id` (uuid), `created_at`. RLS: all authenticated can read, founders/MFOs can manage.

3. **`startup_milestones` table** — `id`, `startup_id` (uuid), `title` (text), `description` (text nullable), `deadline` (date nullable), `status` (text: pending/in-progress/done), `created_by` (uuid), `created_at`. RLS: all authenticated can read, founders/MFOs can manage.

4. **`startup_contacts` table** — `id`, `startup_id` (uuid), `name` (text), `role` (text), `email` (text nullable), `phone` (text nullable), `notes` (text nullable), `created_by` (uuid), `created_at`. RLS: all authenticated can read, founders/MFOs can manage.

5. **`startup-documents` storage bucket** — public: false. RLS policies for authenticated upload/read, founder/MFO delete.

6. **`startup_documents` table** — `id`, `startup_id` (uuid), `file_name` (text), `file_url` (text), `doc_type` (text: pitch-deck/financials/legal/other), `uploaded_by` (uuid), `created_at`. RLS: same pattern.

### New Files

1. **`src/hooks/useStartupHub.ts`** — Custom hooks: `useKaiMemories`, `useStartupNotes`, `useStartupMilestones`, `useStartupContacts`, `useStartupDocuments`. Each with query + upsert/create + remove mutations via TanStack Query.

2. **`src/components/startup-hub/PrioritiesTab.tsx`** — Quick-add priority form (severity, owner, deadline) linked to startup. Uses existing `usePriorities` hook filtered by `startupId`. Lists existing priorities with status toggles.

3. **`src/components/startup-hub/PeopleTab.tsx`** — Shows assigned team members from `startup_assignments`. Add from existing profiles dropdown. Link to invite modal for new users.

4. **`src/components/startup-hub/KaiMemoriesTab.tsx`** — Add/view/delete memories with category tags. Simple card list with add form.

5. **`src/components/startup-hub/DocumentsTab.tsx`** — File upload to `startup-documents` bucket. Categorize by type. Download/delete.

6. **`src/components/startup-hub/NotesTab.tsx`** — Timestamped notes log. Add note textarea + submit. Shows author name from profiles.

7. **`src/components/startup-hub/MilestonesTab.tsx`** — Add milestones with title, deadline, status. Visual progress (done/total). Toggle status. Replaces the "Plan" placeholder.

8. **`src/components/startup-hub/ContactsTab.tsx`** — External contacts table (name, role, email, phone, notes). Add/edit/delete.

### Modified Files

1. **`src/pages/StartupDetail.tsx`** — Add a horizontal tab/icon bar below the header with icons for each section: Priorities, People, KAI Memories, Documents, Notes, Milestones, Contacts. Each tab renders the corresponding component. Remove the "Plan" placeholder section. Keep existing sections (Snapshot, Problems, Tasks, KAI Intelligence, MFO Updates, Activity, Ask KAI) as they are, positioned below the hub tabs.

### UI Approach

- Horizontal icon bar with labels (similar to the existing NavTabs pattern)
- Icons: `AlertTriangle` (Priorities), `Users` (People), `Brain` (KAI Memories), `FolderOpen` (Documents), `StickyNote` (Notes), `Target` (Milestones), `Contact` (Contacts)
- Each tab section renders in-place below the bar, above the existing page content
- Clean, card-based forms — not spreadsheet-like

