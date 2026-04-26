-- 1. Create project_tasks table
CREATE TABLE IF NOT EXISTS public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  assignee_profile UUID,
  assignee_person_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'not_started',
  completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  progress_note TEXT,
  blocked_reason TEXT,
  deadline DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON public.project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_assignee_profile ON public.project_tasks(assignee_profile);

-- 2. Enable RLS
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_tasks_select" ON public.project_tasks
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "project_tasks_insert" ON public.project_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      assignee_profile = auth.uid()
      OR public.is_project_lead(project_id, auth.uid())
      OR public.has_role(auth.uid(), 'founder'::app_role)
      OR public.has_role(auth.uid(), 'mfo'::app_role)
      OR public.has_role(auth.uid(), 'project_manager'::app_role)
    )
  );

CREATE POLICY "project_tasks_update" ON public.project_tasks
  FOR UPDATE TO authenticated
  USING (
    assignee_profile = auth.uid()
    OR public.is_project_lead(project_id, auth.uid())
    OR public.has_role(auth.uid(), 'founder'::app_role)
    OR public.has_role(auth.uid(), 'mfo'::app_role)
    OR public.has_role(auth.uid(), 'project_manager'::app_role)
  );

CREATE POLICY "project_tasks_delete" ON public.project_tasks
  FOR DELETE TO authenticated
  USING (
    public.is_project_lead(project_id, auth.uid())
    OR public.has_role(auth.uid(), 'founder'::app_role)
    OR public.has_role(auth.uid(), 'mfo'::app_role)
    OR public.has_role(auth.uid(), 'project_manager'::app_role)
  );

-- updated_at trigger
DROP TRIGGER IF EXISTS set_updated_at_project_tasks ON public.project_tasks;
CREATE TRIGGER set_updated_at_project_tasks
  BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Repoint project completion trigger to average task completion
CREATE OR REPLACE FUNCTION public.update_project_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  avg_pct INTEGER;
  pid UUID;
BEGIN
  pid := COALESCE(NEW.project_id, OLD.project_id);

  SELECT COALESCE(ROUND(AVG(completion_percentage)), 0)
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

DROP TRIGGER IF EXISTS update_project_completion_on_tasks ON public.project_tasks;
CREATE TRIGGER update_project_completion_on_tasks
  AFTER INSERT OR UPDATE OR DELETE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_project_completion();

-- 4. Migrate existing per-member tasks into project_tasks
INSERT INTO public.project_tasks (
  project_id, assignee_profile, assignee_person_id,
  title, description, status, completion_percentage,
  progress_note, blocked_reason, created_at, updated_at
)
SELECT
  pm.project_id,
  pm.profile_id,
  pm.person_id,
  COALESCE(NULLIF(pm.task_title, ''), 'Task'),
  pm.task_description,
  pm.status,
  pm.completion_percentage,
  pm.progress_note,
  pm.blocked_reason,
  pm.assigned_at,
  pm.updated_at
FROM public.project_members pm
WHERE pm.task_title IS NOT NULL AND pm.task_title <> '';

-- Recompute completion for all projects
UPDATE public.projects p
   SET overall_completion = COALESCE((
     SELECT ROUND(AVG(completion_percentage))
       FROM public.project_tasks
      WHERE project_id = p.id
   ), 0);

-- Realtime
ALTER TABLE public.project_tasks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_tasks;