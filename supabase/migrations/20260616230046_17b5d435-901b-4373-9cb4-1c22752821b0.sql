CREATE TABLE IF NOT EXISTS public.connector_data_github_repos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL,
  org_login TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  default_branch TEXT,
  pushed_at TIMESTAMPTZ,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (startup_id, org_login, repo_name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.connector_data_github_repos TO authenticated;
GRANT ALL ON public.connector_data_github_repos TO service_role;

ALTER TABLE public.connector_data_github_repos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage github repos registry"
ON public.connector_data_github_repos
FOR ALL
USING (public.is_founder(auth.uid()))
WITH CHECK (public.is_founder(auth.uid()));

CREATE POLICY "Authenticated read github repos registry"
ON public.connector_data_github_repos
FOR SELECT
TO authenticated
USING (true);

CREATE INDEX IF NOT EXISTS idx_github_repos_startup ON public.connector_data_github_repos(startup_id);
CREATE INDEX IF NOT EXISTS idx_github_repos_org ON public.connector_data_github_repos(startup_id, org_login);