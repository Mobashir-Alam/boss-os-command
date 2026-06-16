ALTER TABLE public.connector_data_github_repos
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT;

UPDATE public.connector_data_github_repos
   SET full_name = org_login || '/' || repo_name
 WHERE full_name IS NULL;