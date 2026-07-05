
-- ── sync_log ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID REFERENCES public.startups(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'success',
  rows_touched INTEGER DEFAULT 0,
  error TEXT
);

GRANT SELECT ON public.sync_log TO authenticated;
GRANT ALL ON public.sync_log TO service_role;

CREATE INDEX IF NOT EXISTS idx_sync_log_startup_started
  ON public.sync_log (startup_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_source_started
  ON public.sync_log (source, started_at DESC);

ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read sync_log" ON public.sync_log;
CREATE POLICY "Authenticated users can read sync_log"
  ON public.sync_log FOR SELECT TO authenticated USING (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_log;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── pg_cron auto-sync every 3 hours ────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule('auto-sync-all');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Uses the vault-stored service role key (same pattern as email_queue_dispatch).
SELECT cron.schedule(
  'auto-sync-all',
  '0 */3 * * *',
  $cron$
    SELECT net.http_post(
      url := 'https://gnkyujdmrnoprwredzcy.supabase.co/functions/v1/auto-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret FROM vault.decrypted_secrets
          WHERE name = 'email_queue_service_role_key'
        )
      ),
      body := '{}'::jsonb
    );
  $cron$
);

-- ── employee_connector_links ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_connector_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES public.people(id) ON DELETE CASCADE,
  startup_id UUID REFERENCES public.startups(id),
  slack_user_id TEXT,
  github_login TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(person_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_connector_links TO authenticated;
GRANT ALL ON public.employee_connector_links TO service_role;

CREATE INDEX IF NOT EXISTS idx_employee_links_startup
  ON public.employee_connector_links (startup_id);
CREATE INDEX IF NOT EXISTS idx_employee_links_github_login
  ON public.employee_connector_links (github_login);
CREATE INDEX IF NOT EXISTS idx_employee_links_slack_user
  ON public.employee_connector_links (slack_user_id);

ALTER TABLE public.employee_connector_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read links" ON public.employee_connector_links;
CREATE POLICY "Authenticated can read links"
  ON public.employee_connector_links FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert links" ON public.employee_connector_links;
CREATE POLICY "Authenticated can insert links"
  ON public.employee_connector_links FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update links" ON public.employee_connector_links;
CREATE POLICY "Authenticated can update links"
  ON public.employee_connector_links FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can delete links" ON public.employee_connector_links;
CREATE POLICY "Authenticated can delete links"
  ON public.employee_connector_links FOR DELETE TO authenticated USING (true);

-- ── ceo_insights_cache ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ceo_insights_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  period_days INTEGER NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  insights_json JSONB NOT NULL,
  UNIQUE (startup_id, period_days)
);

GRANT SELECT ON public.ceo_insights_cache TO authenticated;
GRANT ALL ON public.ceo_insights_cache TO service_role;

ALTER TABLE public.ceo_insights_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read ceo insights" ON public.ceo_insights_cache;
CREATE POLICY "Authenticated can read ceo insights"
  ON public.ceo_insights_cache FOR SELECT TO authenticated USING (true);

-- ── Perf indexes ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_yt_analytics_video_date
  ON public.connector_data_youtube_video_analytics (video_uuid, date DESC);
CREATE INDEX IF NOT EXISTS idx_github_daily_login_date
  ON public.connector_data_github_daily (github_login, activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_github_daily_date
  ON public.connector_data_github_daily (activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_slack_attendance_date
  ON public.slack_daily_attendance (work_date DESC, startup_id);
CREATE INDEX IF NOT EXISTS idx_slack_attendance_user
  ON public.slack_daily_attendance (user_id_source, work_date DESC);
