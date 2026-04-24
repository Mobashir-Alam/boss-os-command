DROP POLICY IF EXISTS "projects_select"        ON public.projects;
DROP POLICY IF EXISTS "project_members_select" ON public.project_members;
DROP POLICY IF EXISTS "notifications_select"   ON public.notifications;

CREATE POLICY "projects_select" ON public.projects
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "project_members_select" ON public.project_members
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (recipient_profile_id = auth.uid());