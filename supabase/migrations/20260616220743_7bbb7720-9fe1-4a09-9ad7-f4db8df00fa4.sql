
CREATE TABLE IF NOT EXISTS public.connector_data_github_daily (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id      uuid        NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  github_login    text        NOT NULL,
  repo_name       text        NOT NULL,
  activity_date   date        NOT NULL,
  commits         int         NOT NULL DEFAULT 0,
  prs_opened      int         NOT NULL DEFAULT 0,
  prs_merged      int         NOT NULL DEFAULT 0,
  additions       int         NOT NULL DEFAULT 0,
  deletions       int         NOT NULL DEFAULT 0,
  synced_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, github_login, repo_name, activity_date)
);

CREATE INDEX IF NOT EXISTS github_daily_startup_date_idx
  ON public.connector_data_github_daily (startup_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS github_daily_login_idx
  ON public.connector_data_github_daily (startup_id, github_login);

ALTER TABLE public.connector_data_github_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "github_daily_select" ON public.connector_data_github_daily;
CREATE POLICY "github_daily_select" ON public.connector_data_github_daily
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "github_daily_write" ON public.connector_data_github_daily;
CREATE POLICY "github_daily_write" ON public.connector_data_github_daily
  FOR ALL USING (public.is_founder(auth.uid()));
