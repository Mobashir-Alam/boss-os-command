
-- Helper: is_founder() based on profiles.role
CREATE OR REPLACE FUNCTION public.is_founder(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = 'founder'
  )
$$;

-- ===== projects =====
DROP POLICY IF EXISTS projects_update ON public.projects;
DROP POLICY IF EXISTS projects_delete ON public.projects;

CREATE POLICY projects_update ON public.projects
FOR UPDATE TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    created_by_profile = auth.uid()
    OR public.is_founder(auth.uid())
    OR public.has_role(auth.uid(), 'founder'::app_role)
    OR public.has_role(auth.uid(), 'mfo'::app_role)
    OR public.has_role(auth.uid(), 'project_manager'::app_role)
  )
);

CREATE POLICY projects_delete ON public.projects
FOR DELETE TO authenticated
USING (
  created_by_profile = auth.uid()
  OR public.is_founder(auth.uid())
  OR public.has_role(auth.uid(), 'founder'::app_role)
  OR public.has_role(auth.uid(), 'mfo'::app_role)
);

-- ===== project_members =====
DROP POLICY IF EXISTS project_members_insert ON public.project_members;
DROP POLICY IF EXISTS project_members_update ON public.project_members;
DROP POLICY IF EXISTS project_members_delete ON public.project_members;

CREATE POLICY project_members_insert ON public.project_members
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.is_project_lead(project_id, auth.uid())
    OR public.is_founder(auth.uid())
    OR public.has_role(auth.uid(), 'founder'::app_role)
    OR public.has_role(auth.uid(), 'mfo'::app_role)
    OR public.has_role(auth.uid(), 'project_manager'::app_role)
  )
);

CREATE POLICY project_members_update ON public.project_members
FOR UPDATE TO authenticated
USING (
  profile_id = auth.uid()
  OR public.is_project_lead(project_id, auth.uid())
  OR public.is_founder(auth.uid())
  OR public.has_role(auth.uid(), 'founder'::app_role)
  OR public.has_role(auth.uid(), 'mfo'::app_role)
  OR public.has_role(auth.uid(), 'project_manager'::app_role)
);

CREATE POLICY project_members_delete ON public.project_members
FOR DELETE TO authenticated
USING (
  profile_id = auth.uid()
  OR public.is_project_lead(project_id, auth.uid())
  OR public.is_founder(auth.uid())
  OR public.has_role(auth.uid(), 'founder'::app_role)
  OR public.has_role(auth.uid(), 'mfo'::app_role)
  OR public.has_role(auth.uid(), 'project_manager'::app_role)
);

-- ===== project_tasks =====
DROP POLICY IF EXISTS project_tasks_insert ON public.project_tasks;
DROP POLICY IF EXISTS project_tasks_update ON public.project_tasks;
DROP POLICY IF EXISTS project_tasks_delete ON public.project_tasks;

CREATE POLICY project_tasks_insert ON public.project_tasks
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    assignee_profile = auth.uid()
    OR public.is_project_lead(project_id, auth.uid())
    OR public.is_founder(auth.uid())
    OR public.has_role(auth.uid(), 'founder'::app_role)
    OR public.has_role(auth.uid(), 'mfo'::app_role)
    OR public.has_role(auth.uid(), 'project_manager'::app_role)
  )
);

CREATE POLICY project_tasks_update ON public.project_tasks
FOR UPDATE TO authenticated
USING (
  assignee_profile = auth.uid()
  OR public.is_project_lead(project_id, auth.uid())
  OR public.is_founder(auth.uid())
  OR public.has_role(auth.uid(), 'founder'::app_role)
  OR public.has_role(auth.uid(), 'mfo'::app_role)
  OR public.has_role(auth.uid(), 'project_manager'::app_role)
);

CREATE POLICY project_tasks_delete ON public.project_tasks
FOR DELETE TO authenticated
USING (
  public.is_project_lead(project_id, auth.uid())
  OR public.is_founder(auth.uid())
  OR public.has_role(auth.uid(), 'founder'::app_role)
  OR public.has_role(auth.uid(), 'mfo'::app_role)
  OR public.has_role(auth.uid(), 'project_manager'::app_role)
);

NOTIFY pgrst, 'reload schema';
