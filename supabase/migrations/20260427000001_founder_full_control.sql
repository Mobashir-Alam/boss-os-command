-- Give the CEO (profiles.role = 'founder') full write authority on
-- projects, project_members, and project_tasks — even on projects they
-- did not personally create or lead.
--
-- Pattern: small SECURITY DEFINER helper that returns true when the
-- current auth user is a founder. The function bypasses RLS on
-- profiles so it can be called from other RLS policies without
-- recursion or permission errors.

-- ─────────────────────────────────────────────────────────────
-- 1. is_founder() helper
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_founder()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'founder'
  );
$$;

REVOKE ALL ON FUNCTION public.is_founder() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_founder() TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 2. projects: add founder bypass to UPDATE and DELETE
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "projects_update" ON public.projects;
CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE USING (
    public.is_founder()
    OR created_by_profile = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.project_members lead
       WHERE lead.project_id = projects.id
         AND lead.profile_id = auth.uid()
         AND lead.role       = 'lead'
    )
  );

DROP POLICY IF EXISTS "projects_delete" ON public.projects;
CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE USING (
    public.is_founder()
    OR created_by_profile = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.project_members lead
       WHERE lead.project_id = projects.id
         AND lead.profile_id = auth.uid()
         AND lead.role       = 'lead'
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 3. project_members: add founder bypass to UPDATE and DELETE
--    (insert was already open to any authenticated user)
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "project_members_update" ON public.project_members;
CREATE POLICY "project_members_update" ON public.project_members
  FOR UPDATE USING (
    public.is_founder()
    OR profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.project_members lead
       WHERE lead.project_id = project_members.project_id
         AND lead.profile_id = auth.uid()
         AND lead.role       = 'lead'
    )
  );

DROP POLICY IF EXISTS "project_members_delete" ON public.project_members;
CREATE POLICY "project_members_delete" ON public.project_members
  FOR DELETE USING (
    public.is_founder()
    OR profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p
       WHERE p.id = project_members.project_id
         AND p.created_by_profile = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_members lead
       WHERE lead.project_id = project_members.project_id
         AND lead.profile_id = auth.uid()
         AND lead.role       = 'lead'
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 4. project_tasks: add founder bypass to INSERT, UPDATE, DELETE
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "project_tasks_insert" ON public.project_tasks;
CREATE POLICY "project_tasks_insert" ON public.project_tasks
  FOR INSERT WITH CHECK (
    public.is_founder()
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

DROP POLICY IF EXISTS "project_tasks_update" ON public.project_tasks;
CREATE POLICY "project_tasks_update" ON public.project_tasks
  FOR UPDATE USING (
    public.is_founder()
    OR assignee_profile = auth.uid()
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

DROP POLICY IF EXISTS "project_tasks_delete" ON public.project_tasks;
CREATE POLICY "project_tasks_delete" ON public.project_tasks
  FOR DELETE USING (
    public.is_founder()
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

-- Note on progress fields: even with founder bypass on UPDATE, the
-- frontend still hides progress controls when the viewer is not the
-- assignee. That's an accountability rule, not a security rule — the
-- DB allows it (CEO override) but the UI doesn't expose it.
