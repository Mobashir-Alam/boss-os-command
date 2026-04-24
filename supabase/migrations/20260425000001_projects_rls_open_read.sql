-- Relax projects and project_members read policies.
-- The initial policy only allowed members/creators to read their own projects.
-- For the current product stage (demo + CEO portfolio view), any authenticated
-- user should be able to read all projects. Write policies stay restrictive.
-- This will be tightened to role-based policies in a later phase.

DROP POLICY IF EXISTS "projects_select"        ON public.projects;
DROP POLICY IF EXISTS "project_members_select" ON public.project_members;
DROP POLICY IF EXISTS "notifications_select"   ON public.notifications;

-- Projects: any authenticated user can read
CREATE POLICY "projects_select" ON public.projects
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Project members: any authenticated user can read member rows
CREATE POLICY "project_members_select" ON public.project_members
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Notifications: keep restricted — only the recipient sees their own
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (recipient_profile_id = auth.uid());
