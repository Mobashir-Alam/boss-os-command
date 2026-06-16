-- GitHub repo registry — the full list of repos in the org(s), regardless of
-- recent activity. The Repos tab joins this against connector_data_github_daily
-- so dormant repos (no commits in the sync window) still appear, and users can
-- list/filter everything instead of only the actively-committed repos.
CREATE TABLE IF NOT EXISTS public.connector_data_github_repos (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id    uuid        NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  org           text        NOT NULL,
  repo_name     text        NOT NULL,
  full_name     text        NOT NULL,
  is_private    boolean     NOT NULL DEFAULT false,
  is_archived   boolean     NOT NULL DEFAULT false,
  language      text,
  open_issues   int         NOT NULL DEFAULT 0,
  pushed_at     timestamptz,
  html_url      text,
  synced_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, full_name)
);

CREATE INDEX IF NOT EXISTS github_repos_startup_idx
  ON public.connector_data_github_repos (startup_id);

ALTER TABLE public.connector_data_github_repos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "github_repos_select" ON public.connector_data_github_repos;
CREATE POLICY "github_repos_select" ON public.connector_data_github_repos
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "github_repos_write" ON public.connector_data_github_repos;
CREATE POLICY "github_repos_write" ON public.connector_data_github_repos
  FOR ALL USING (public.is_founder(auth.uid()));
