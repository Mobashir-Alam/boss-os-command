-- Employee Phase: Projects, Project Members, and Notifications

CREATE TABLE IF NOT EXISTS public.projects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id          UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  department_key      TEXT,
  title               TEXT NOT NULL,
  description         TEXT,
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  deadline            DATE,
  created_by_profile  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  overall_completion  INTEGER NOT NULL DEFAULT 0 CHECK (overall_completion BETWEEN 0 AND 100),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_startup_id_idx ON public.projects(startup_id);
CREATE INDEX IF NOT EXISTS projects_department_key_idx ON public.projects(department_key);
CREATE INDEX IF NOT EXISTS projects_status_idx ON public.projects(status);

CREATE TABLE IF NOT EXISTS public.project_members (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  profile_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id             UUID REFERENCES public.people(id) ON DELETE SET NULL,
  role                  TEXT NOT NULL DEFAULT 'member'
                          CHECK (role IN ('lead', 'member')),
  task_title            TEXT,
  task_description      TEXT,
  status                TEXT NOT NULL DEFAULT 'not_started'
                          CHECK (status IN ('not_started', 'in_progress', 'done', 'blocked')),
  completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  progress_note         TEXT,
  blocked_reason        TEXT,
  assigned_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, profile_id)
);

CREATE INDEX IF NOT EXISTS project_members_project_id_idx ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS project_members_profile_id_idx ON public.project_members(profile_id);

CREATE TABLE IF NOT EXISTS public.notifications (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type                 TEXT NOT NULL DEFAULT 'project_assigned'
                         CHECK (type IN ('project_assigned', 'task_updated', 'project_completed', 'project_paused')),
  project_id           UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  message              TEXT NOT NULL,
  read                 BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_recipient_idx ON public.notifications(recipient_profile_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON public.notifications(recipient_profile_id, read);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'projects_updated_at') THEN
    CREATE TRIGGER projects_updated_at
      BEFORE UPDATE ON public.projects
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'project_members_updated_at') THEN
    CREATE TRIGGER project_members_updated_at
      BEFORE UPDATE ON public.project_members
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_project_completion()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  avg_pct INTEGER;
BEGIN
  SELECT COALESCE(ROUND(AVG(completion_percentage)), 0)
    INTO avg_pct
    FROM public.project_members
   WHERE project_id = COALESCE(NEW.project_id, OLD.project_id);

  UPDATE public.projects
     SET overall_completion = avg_pct,
         updated_at         = now()
   WHERE id = COALESCE(NEW.project_id, OLD.project_id);

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sync_project_completion') THEN
    CREATE TRIGGER sync_project_completion
      AFTER INSERT OR UPDATE OR DELETE ON public.project_members
      FOR EACH ROW EXECUTE FUNCTION public.update_project_completion();
  END IF;
END $$;

ALTER TABLE public.projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select" ON public.projects
  FOR SELECT USING (
    created_by_profile = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = projects.id
        AND pm.profile_id = auth.uid()
    )
  );

CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE USING (created_by_profile = auth.uid());

CREATE POLICY "project_members_select" ON public.project_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm2
      WHERE pm2.project_id = project_members.project_id
        AND pm2.profile_id = auth.uid()
    )
  );

CREATE POLICY "project_members_insert" ON public.project_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "project_members_update" ON public.project_members
  FOR UPDATE USING (profile_id = auth.uid());

CREATE POLICY "project_members_delete" ON public.project_members
  FOR DELETE USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_members.project_id
        AND p.created_by_profile = auth.uid()
    )
  );

CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (recipient_profile_id = auth.uid());

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE USING (recipient_profile_id = auth.uid());

CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);