-- Promote Priya to project_manager and widen RLS so per-project leads can
-- update / delete any member row on the projects they lead.
-- (Per-project lead powers must NOT depend on system role.)

-- 1. Promote our test user
UPDATE public.profiles
   SET role = 'project_manager'
 WHERE email = 'priya.test@nasheedio.com';

-- 2. project_members UPDATE: own row OR any row on a project where I am lead
DROP POLICY IF EXISTS "project_members_update" ON public.project_members;
CREATE POLICY "project_members_update" ON public.project_members
  FOR UPDATE USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.project_members lead
       WHERE lead.project_id = project_members.project_id
         AND lead.profile_id = auth.uid()
         AND lead.role       = 'lead'
    )
  );

-- 3. project_members DELETE: self, project creator, OR project lead
DROP POLICY IF EXISTS "project_members_delete" ON public.project_members;
CREATE POLICY "project_members_delete" ON public.project_members
  FOR DELETE USING (
    profile_id = auth.uid()
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

-- 4. projects UPDATE: creator OR current lead on the project
DROP POLICY IF EXISTS "projects_update" ON public.projects;
CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE USING (
    created_by_profile = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.project_members lead
       WHERE lead.project_id = projects.id
         AND lead.profile_id = auth.uid()
         AND lead.role       = 'lead'
    )
  );

-- 5. projects DELETE: creator OR current lead
DROP POLICY IF EXISTS "projects_delete" ON public.projects;
CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE USING (
    created_by_profile = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.project_members lead
       WHERE lead.project_id = projects.id
         AND lead.profile_id = auth.uid()
         AND lead.role       = 'lead'
    )
  );
