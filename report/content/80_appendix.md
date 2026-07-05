# APPENDIX

## Appendix A: Selected Schema — Connector Framework

The connector framework is anchored by the `connector_credentials` table, which stores one credential per connector per startup and is writable only by a founder. The raw GitHub data table is keyed for idempotent ingestion.

```
CREATE TABLE public.connector_credentials (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id      uuid NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  connector_type  text NOT NULL
                  CHECK (connector_type IN
                        ('github','slack','youtube','google_sheets','spotify','drive')),
  credentials     jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active       boolean NOT NULL DEFAULT true,
  last_synced_at  timestamptz,
  last_sync_error text,
  UNIQUE (startup_id, connector_type)
);

CREATE TABLE public.connector_data_github (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id        uuid NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  record_type       text NOT NULL CHECK (record_type IN ('pull_request','issue','commit')),
  external_id       text NOT NULL,
  repo_name         text NOT NULL,
  author_login      text,
  author_profile_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at_source timestamptz,
  raw_payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (startup_id, record_type, external_id)   -- makes sync idempotent
);
```

## Appendix B: Selected Row-Level Security Policy

Authorization is enforced in the database. A `SECURITY DEFINER` helper resolves the caller's role, and policies reference it. The example below restricts writes to founders while allowing authenticated reads.

```
-- Helper: is the current user a founder?
CREATE OR REPLACE FUNCTION public.is_founder(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = 'founder'
  )
$$;

-- Policy: only a founder may write credentials; any authenticated user may read.
ALTER TABLE public.connector_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "connector_credentials_select" ON public.connector_credentials
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "connector_credentials_write" ON public.connector_credentials
  FOR ALL USING (public.is_founder(auth.uid()));
```

## Appendix C: Deployment and Configuration Notes

The application is configured through server-side secrets held by the Supabase project (never exposed to the browser):

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — used by edge functions for privileged database access.
- `LOVABLE_API_KEY` — authenticates calls from the KAI functions to the AI gateway.
- Per-connector credentials (OAuth client ID/secret and refresh token for YouTube; bot token for Slack; personal access token plus organisation list for GitHub) — stored as rows in `connector_credentials`.

Edge functions are declared in the Supabase configuration with JWT verification disabled where they are invoked server-to-server, and schema changes are applied as versioned SQL migrations. The front end is built with Vite and deployed through the Lovable platform.

## Appendix D: How to Rebuild This Report

This report is generated from editable Markdown by a Python script:

```
pip install python-docx
python report/render_figures.ps1        # or render figures/*.mmd at mermaid.live
python report/build_report.py           # writes report/Founder_OS_Report.docx
```

Open the resulting document in Microsoft Word and choose "Update Field" (Ctrl+A, then F9) to populate the Table of Contents, List of Figures, and List of Tables. Replace any «PLACEHOLDER» values on the title page and certificate, and place the Chapter 5 screenshots in `report/figures/` using the file names referenced in the text.
