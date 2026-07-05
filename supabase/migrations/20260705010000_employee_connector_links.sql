-- Links a People OS person to their Slack user + GitHub login so activity
-- data from the connectors can be attributed to employees.

CREATE TABLE IF NOT EXISTS public.employee_connector_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES public.people(id) ON DELETE CASCADE,
  startup_id UUID REFERENCES public.startups(id),
  slack_user_id TEXT,           -- matches connector_data_slack_users.user_id_source
  github_login TEXT,            -- matches connector_data_github_daily.github_login
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(person_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_links_startup
  ON public.employee_connector_links (startup_id);
CREATE INDEX IF NOT EXISTS idx_employee_links_github_login
  ON public.employee_connector_links (github_login);
CREATE INDEX IF NOT EXISTS idx_employee_links_slack_user
  ON public.employee_connector_links (slack_user_id);

ALTER TABLE public.employee_connector_links ENABLE ROW LEVEL SECURITY;

-- Authenticated users of the app can read and manage links. (The app has no
-- per-startup membership table yet; when one lands, tighten these policies to
-- scope by the user's startup.)
DROP POLICY IF EXISTS "Authenticated can read links" ON public.employee_connector_links;
CREATE POLICY "Authenticated can read links"
  ON public.employee_connector_links FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert links" ON public.employee_connector_links;
CREATE POLICY "Authenticated can insert links"
  ON public.employee_connector_links FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update links" ON public.employee_connector_links;
CREATE POLICY "Authenticated can update links"
  ON public.employee_connector_links FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can delete links" ON public.employee_connector_links;
CREATE POLICY "Authenticated can delete links"
  ON public.employee_connector_links FOR DELETE
  TO authenticated USING (true);
