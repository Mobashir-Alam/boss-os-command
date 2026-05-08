-- Connector framework foundation:
-- 1. connector_credentials  — encrypted PAT tokens per connector per startup
-- 2. connector_data_github  — raw GitHub PRs / issues / commits
-- 3. connector_data_slack   — raw Slack channel messages
-- 4. metrics                — normalised, KAI-consumable metric rows
-- 5. kai_insights           — AI-generated insight records

-- ─────────────────────────────────────────────────────────────
-- 1. connector_credentials
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.connector_credentials (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id      uuid        NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  connector_type  text        NOT NULL
                              CHECK (connector_type IN ('github','slack','youtube','google_sheets','spotify','drive')),
  label           text,
  credentials     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  is_active       boolean     NOT NULL DEFAULT true,
  last_synced_at  timestamptz,
  last_sync_error text,
  created_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, connector_type)
);

ALTER TABLE public.connector_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "connector_credentials_select" ON public.connector_credentials;
CREATE POLICY "connector_credentials_select" ON public.connector_credentials
  FOR SELECT USING (public.is_founder() OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "connector_credentials_write" ON public.connector_credentials;
CREATE POLICY "connector_credentials_write" ON public.connector_credentials
  FOR ALL USING (public.is_founder());

CREATE TRIGGER connector_credentials_updated_at
  BEFORE UPDATE ON public.connector_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 2. connector_data_github
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.connector_data_github (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id          uuid        NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  record_type         text        NOT NULL CHECK (record_type IN ('pull_request','issue','commit')),
  external_id         text        NOT NULL,
  repo_name           text        NOT NULL,
  author_login        text,
  author_profile_id   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  title               text,
  state               text,
  body                text,
  labels              text[]      NOT NULL DEFAULT '{}',
  created_at_source   timestamptz,
  updated_at_source   timestamptz,
  closed_at_source    timestamptz,
  merged_at_source    timestamptz,
  raw_payload         jsonb       NOT NULL DEFAULT '{}'::jsonb,
  synced_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, record_type, external_id)
);

CREATE INDEX IF NOT EXISTS github_data_startup_type_idx
  ON public.connector_data_github (startup_id, record_type);
CREATE INDEX IF NOT EXISTS github_data_author_idx
  ON public.connector_data_github (author_profile_id);
CREATE INDEX IF NOT EXISTS github_data_state_idx
  ON public.connector_data_github (startup_id, state);

ALTER TABLE public.connector_data_github ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "github_data_select" ON public.connector_data_github;
CREATE POLICY "github_data_select" ON public.connector_data_github
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "github_data_write" ON public.connector_data_github;
CREATE POLICY "github_data_write" ON public.connector_data_github
  FOR ALL USING (public.is_founder());

-- ─────────────────────────────────────────────────────────────
-- 3. connector_data_slack
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.connector_data_slack (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id        uuid        NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  channel_id        text        NOT NULL,
  channel_name      text,
  message_ts        text        NOT NULL,
  user_id_source    text,
  author_profile_id uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  text              text,
  thread_ts         text,
  reaction_count    int         NOT NULL DEFAULT 0,
  reply_count       int         NOT NULL DEFAULT 0,
  has_files         boolean     NOT NULL DEFAULT false,
  message_date      date,
  raw_payload       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  synced_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, channel_id, message_ts)
);

CREATE INDEX IF NOT EXISTS slack_data_startup_channel_idx
  ON public.connector_data_slack (startup_id, channel_id);
CREATE INDEX IF NOT EXISTS slack_data_date_idx
  ON public.connector_data_slack (startup_id, message_date DESC);

ALTER TABLE public.connector_data_slack ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "slack_data_select" ON public.connector_data_slack;
CREATE POLICY "slack_data_select" ON public.connector_data_slack
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "slack_data_write" ON public.connector_data_slack;
CREATE POLICY "slack_data_write" ON public.connector_data_slack
  FOR ALL USING (public.is_founder());

-- ─────────────────────────────────────────────────────────────
-- 4. metrics
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.metrics (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id      uuid        NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  connector_type  text        NOT NULL,
  department_key  text,
  metric_name     text        NOT NULL,
  metric_value    numeric,
  metric_text     text,
  period_start    date        NOT NULL,
  period_end      date        NOT NULL,
  granularity     text        NOT NULL DEFAULT 'daily'
                              CHECK (granularity IN ('hourly','daily','weekly','monthly')),
  source_ref      text,
  raw_data        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  synced_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (startup_id, connector_type, metric_name, period_start, granularity)
);

CREATE INDEX IF NOT EXISTS metrics_startup_connector_idx
  ON public.metrics (startup_id, connector_type);
CREATE INDEX IF NOT EXISTS metrics_dept_idx
  ON public.metrics (startup_id, department_key, metric_name);
CREATE INDEX IF NOT EXISTS metrics_period_idx
  ON public.metrics (startup_id, period_start DESC);

ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "metrics_select" ON public.metrics;
CREATE POLICY "metrics_select" ON public.metrics
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "metrics_write" ON public.metrics;
CREATE POLICY "metrics_write" ON public.metrics
  FOR ALL USING (public.is_founder());

-- ─────────────────────────────────────────────────────────────
-- 5. kai_insights
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.kai_insights (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id      uuid        NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  department_key  text,
  insight_type    text        NOT NULL DEFAULT 'summary'
                              CHECK (insight_type IN ('summary','risk','opportunity','action','prediction')),
  title           text,
  body            text        NOT NULL,
  confidence      text        CHECK (confidence IN ('high','medium','low')),
  data_sources    text[]      NOT NULL DEFAULT '{}',
  is_read         boolean     NOT NULL DEFAULT false,
  is_dismissed    boolean     NOT NULL DEFAULT false,
  generated_at    timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz
);

CREATE INDEX IF NOT EXISTS kai_insights_startup_idx
  ON public.kai_insights (startup_id, is_dismissed, generated_at DESC);
CREATE INDEX IF NOT EXISTS kai_insights_dept_idx
  ON public.kai_insights (startup_id, department_key, is_dismissed);

ALTER TABLE public.kai_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kai_insights_select" ON public.kai_insights;
CREATE POLICY "kai_insights_select" ON public.kai_insights
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "kai_insights_write" ON public.kai_insights;
CREATE POLICY "kai_insights_write" ON public.kai_insights
  FOR ALL USING (public.is_founder());

DROP POLICY IF EXISTS "kai_insights_update_read" ON public.kai_insights;
CREATE POLICY "kai_insights_update_read" ON public.kai_insights
  FOR UPDATE USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────────────────────
-- 6. Realtime for kai_insights (live insight feed)
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.kai_insights;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
