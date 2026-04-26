-- Project Tasks: many tasks per project, each assignable to one member.
-- Supersedes the single-task-per-member pattern on project_members.
-- Existing project_members.task_* fields stay in place as legacy (no-op),
-- and any non-null task_title there is migrated into a project_tasks row
-- so no work is lost.

-- ─────────────────────────────────────────────────────────────
-- 1. Table
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.project_tasks (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  assignee_profile   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title                 text NOT NULL CHECK (length(trim(title)) > 0),
  description           text,
  status                text NOT NULL DEFAULT 'not_started'
                          CHECK (status IN ('not_started', 'in_progress', 'done', 'blocked')),
  completion_percentage int  NOT NULL DEFAULT 0
                          CHECK (completion_percentage BETWEEN 0 AND 100),
  deadline              date,
  progress_note         text,
  blocked_reason        text,
  created_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_tasks_project_idx
  ON public.project_tasks(project_id);
CREATE INDEX IF NOT EXISTS project_tasks_assignee_idx
  ON public.project_tasks(assignee_profile);
CREATE INDEX IF NOT EXISTS project_tasks_status_idx
  ON public.project_tasks(status);

-- ─────────────────────────────────────────────────────────────
-- 2. updated_at trigger (reuse existing set_updated_at)
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'project_tasks_updated_at') THEN
    CREATE TRIGGER project_tasks_updated_at
      BEFORE UPDATE ON public.project_tasks
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 3. Re-point project completion to average task completion.
--    (Falls back to 0 when no tasks exist on the project.)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_project_completion_from_tasks()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  pid     uuid;
  avg_pct int;
BEGIN
  pid := COALESCE(NEW.project_id, OLD.project_id);

  SELECT COALESCE(ROUND(AVG(completion_percentage))::int, 0)
    INTO avg_pct
    FROM public.project_tasks
   WHERE project_id = pid;

  UPDATE public.projects
     SET overall_completion = avg_pct,
         updated_at         = now()
   WHERE id = pid;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sync_project_completion_from_tasks') THEN
    CREATE TRIGGER sync_project_completion_from_tasks
      AFTER INSERT OR UPDATE OR DELETE ON public.project_tasks
      FOR EACH ROW EXECUTE FUNCTION public.update_project_completion_from_tasks();
  END IF;
END $$;

-- Drop the old member-based completion trigger so the two don't fight.
DROP TRIGGER IF EXISTS sync_project_completion ON public.project_members;

-- ─────────────────────────────────────────────────────────────
-- 4. Migrate existing per-member tasks → project_tasks rows
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.project_tasks (
  project_id, assignee_profile, title, description,
  status, completion_percentage, progress_note, blocked_reason,
  created_by, created_at, updated_at
)
SELECT
  pm.project_id,
  pm.profile_id,
  pm.task_title,
  pm.task_description,
  pm.status,
  pm.completion_percentage,
  pm.progress_note,
  pm.blocked_reason,
  p.created_by_profile,
  pm.assigned_at,
  pm.updated_at
FROM public.project_members pm
JOIN public.projects p ON p.id = pm.project_id
WHERE pm.task_title IS NOT NULL
  AND length(trim(pm.task_title)) > 0
ON CONFLICT DO NOTHING;

-- Recompute project.overall_completion now that tasks exist
UPDATE public.projects p
   SET overall_completion = COALESCE((
     SELECT ROUND(AVG(completion_percentage))::int
       FROM public.project_tasks
      WHERE project_id = p.id
   ), 0);

-- ─────────────────────────────────────────────────────────────
-- 5. RLS
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user (matches existing open-read pattern on projects)
DROP POLICY IF EXISTS "project_tasks_select" ON public.project_tasks;
CREATE POLICY "project_tasks_select" ON public.project_tasks
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- INSERT: project lead OR project creator
DROP POLICY IF EXISTS "project_tasks_insert" ON public.project_tasks;
CREATE POLICY "project_tasks_insert" ON public.project_tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
       WHERE p.id = project_tasks.project_id
         AND p.created_by_profile = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_members lead
       WHERE lead.project_id = project_tasks.project_id
         AND lead.profile_id = auth.uid()
         AND lead.role       = 'lead'
    )
  );

-- UPDATE: assignee, project lead, or project creator
DROP POLICY IF EXISTS "project_tasks_update" ON public.project_tasks;
CREATE POLICY "project_tasks_update" ON public.project_tasks
  FOR UPDATE USING (
    assignee_profile = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p
       WHERE p.id = project_tasks.project_id
         AND p.created_by_profile = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_members lead
       WHERE lead.project_id = project_tasks.project_id
         AND lead.profile_id = auth.uid()
         AND lead.role       = 'lead'
    )
  );

-- DELETE: project lead or project creator
DROP POLICY IF EXISTS "project_tasks_delete" ON public.project_tasks;
CREATE POLICY "project_tasks_delete" ON public.project_tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.projects p
       WHERE p.id = project_tasks.project_id
         AND p.created_by_profile = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_members lead
       WHERE lead.project_id = project_tasks.project_id
         AND lead.profile_id = auth.uid()
         AND lead.role       = 'lead'
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 6. Realtime broadcasting (so task list refreshes live)
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_tasks;
  EXCEPTION WHEN duplicate_object THEN
    NULL;  -- already added; ignore
  END;
END $$;
