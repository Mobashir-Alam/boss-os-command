-- Promote priya.test@nasheedio.com to project_manager
DO $$
DECLARE
  priya_id uuid := 'f0000000-0000-4000-8000-000000000002';
BEGIN
  UPDATE public.profiles SET role = 'project_manager' WHERE id = priya_id;
  -- Remove any non-PM role rows for priya, then ensure PM row exists
  DELETE FROM public.user_roles WHERE user_id = priya_id AND role <> 'project_manager';
  INSERT INTO public.user_roles (user_id, role)
  SELECT priya_id, 'project_manager'::app_role
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = priya_id AND role = 'project_manager'
  );
END $$;

-- Helper: is the current user the lead (creator) of a given project?
CREATE OR REPLACE FUNCTION public.is_project_lead(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id AND created_by_profile = _user_id
  )
$$;

-- projects: leads + founders/mfo/PMs can update; leads + founders/mfo can delete
DROP POLICY IF EXISTS "projects_update" ON public.projects;
CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (
      created_by_profile = auth.uid()
      OR public.has_role(auth.uid(), 'founder'::app_role)
      OR public.has_role(auth.uid(), 'mfo'::app_role)
      OR public.has_role(auth.uid(), 'project_manager'::app_role)
    )
  );

DROP POLICY IF EXISTS "projects_delete" ON public.projects;
CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE TO authenticated
  USING (
    created_by_profile = auth.uid()
    OR public.has_role(auth.uid(), 'founder'::app_role)
    OR public.has_role(auth.uid(), 'mfo'::app_role)
  );

-- project_members: leads can manage members on their projects
DROP POLICY IF EXISTS "project_members_insert" ON public.project_members;
CREATE POLICY "project_members_insert" ON public.project_members
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      public.is_project_lead(project_id, auth.uid())
      OR public.has_role(auth.uid(), 'founder'::app_role)
      OR public.has_role(auth.uid(), 'mfo'::app_role)
      OR public.has_role(auth.uid(), 'project_manager'::app_role)
    )
  );

DROP POLICY IF EXISTS "project_members_update" ON public.project_members;
CREATE POLICY "project_members_update" ON public.project_members
  FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.is_project_lead(project_id, auth.uid())
    OR public.has_role(auth.uid(), 'founder'::app_role)
    OR public.has_role(auth.uid(), 'mfo'::app_role)
    OR public.has_role(auth.uid(), 'project_manager'::app_role)
  );

DROP POLICY IF EXISTS "project_members_delete" ON public.project_members;
CREATE POLICY "project_members_delete" ON public.project_members
  FOR DELETE TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.is_project_lead(project_id, auth.uid())
    OR public.has_role(auth.uid(), 'founder'::app_role)
    OR public.has_role(auth.uid(), 'mfo'::app_role)
    OR public.has_role(auth.uid(), 'project_manager'::app_role)
  );

-- project_messages: leads + founders/mfo can moderate-delete; insert/update remain author-only
DROP POLICY IF EXISTS "project_messages_delete" ON public.project_messages;
CREATE POLICY "project_messages_delete" ON public.project_messages
  FOR DELETE TO authenticated
  USING (
    author_profile = auth.uid()
    OR public.is_project_lead(project_id, auth.uid())
    OR public.has_role(auth.uid(), 'founder'::app_role)
    OR public.has_role(auth.uid(), 'mfo'::app_role)
  );