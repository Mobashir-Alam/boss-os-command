-- Auto-sync infrastructure: sync_log table + 3-hour pg_cron schedule that
-- POSTs to the auto-sync edge function.

-- ── sync_log ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID REFERENCES public.startups(id) ON DELETE CASCADE,
  source TEXT NOT NULL,                 -- 'github' | 'slack' | 'youtube' | 'youtube_analytics'
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'success',  -- 'success' | 'error'
  rows_touched INTEGER DEFAULT 0,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_log_startup_started
  ON public.sync_log (startup_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_source_started
  ON public.sync_log (source, started_at DESC);

ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

-- Read-only for signed-in users; writes come exclusively from the auto-sync
-- edge function via the service role (which bypasses RLS).
DROP POLICY IF EXISTS "Authenticated users can read sync_log" ON public.sync_log;
CREATE POLICY "Authenticated users can read sync_log"
  ON public.sync_log FOR SELECT
  TO authenticated
  USING (true);

-- Realtime: dashboards toast when an auto-sync run inserts rows.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_log;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── pg_cron: run auto-sync every 3 hours ───────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop a previous schedule with the same name so this migration is re-runnable.
DO $$
BEGIN
  PERFORM cron.unschedule('auto-sync-all');
EXCEPTION
  WHEN OTHERS THEN NULL;  -- job didn't exist yet
END $$;

-- IMPORTANT: replace <SERVICE_ROLE_KEY> with the project's service role key
-- (Supabase Dashboard → Settings → API) before running this migration.
SELECT cron.schedule(
  'auto-sync-all',
  '0 */3 * * *',
  $$ SELECT net.http_post(
       url := 'https://gnkyujdmrnoprwredzcy.supabase.co/functions/v1/auto-sync',
       headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
       body := '{}'::jsonb
     ) $$
);
