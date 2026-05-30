-- YouTube Connector — Tier 2 Analytics tables.
--
-- Pulled via YouTube Analytics API (requires OAuth, not just API key).
-- Two tables — channel-level daily metrics and per-video daily metrics.
-- Both are upserted on each analytics sync; deltas computable from the
-- timeseries.

-- ─────────────────────────────────────────────────────────────
-- 1. connector_data_youtube_channel_analytics
--    One row per (channel, date). Holds channel-wide daily aggregates.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.connector_data_youtube_channel_analytics (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_uuid                uuid        NOT NULL REFERENCES public.connector_data_youtube_channels(id) ON DELETE CASCADE,
  date                        date        NOT NULL,
  views                       bigint      NOT NULL DEFAULT 0,
  estimated_minutes_watched   bigint      NOT NULL DEFAULT 0,
  average_view_duration_sec   int,                      -- seconds
  subscribers_gained          int         NOT NULL DEFAULT 0,
  subscribers_lost            int         NOT NULL DEFAULT 0,
  likes                       int         NOT NULL DEFAULT 0,
  shares                      int         NOT NULL DEFAULT 0,
  comments                    int         NOT NULL DEFAULT 0,
  impressions                 bigint,
  impressions_ctr             numeric(6,3),             -- 0–100 percent
  -- Monetary fields are only populated when the yt-analytics-monetary scope
  -- is granted AND the channel is monetized; NULL otherwise.
  estimated_revenue_usd       numeric(12,2),
  estimated_ad_revenue_usd    numeric(12,2),
  cpm_usd                     numeric(8,2),
  raw_payload                 jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_uuid, date)
);

CREATE INDEX IF NOT EXISTS youtube_channel_analytics_date_idx
  ON public.connector_data_youtube_channel_analytics (channel_uuid, date DESC);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'youtube_channel_analytics_updated_at') THEN
    CREATE TRIGGER youtube_channel_analytics_updated_at
      BEFORE UPDATE ON public.connector_data_youtube_channel_analytics
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.connector_data_youtube_channel_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "youtube_ch_analytics_select" ON public.connector_data_youtube_channel_analytics;
CREATE POLICY "youtube_ch_analytics_select" ON public.connector_data_youtube_channel_analytics
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "youtube_ch_analytics_write" ON public.connector_data_youtube_channel_analytics;
CREATE POLICY "youtube_ch_analytics_write" ON public.connector_data_youtube_channel_analytics
  FOR ALL USING (public.is_social_media_lead());

-- ─────────────────────────────────────────────────────────────
-- 2. connector_data_youtube_video_analytics
--    Per-video daily analytics. Powers per-video revenue + watch time.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.connector_data_youtube_video_analytics (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  video_uuid                  uuid        NOT NULL REFERENCES public.connector_data_youtube_videos(id) ON DELETE CASCADE,
  date                        date        NOT NULL,
  views                       bigint      NOT NULL DEFAULT 0,
  estimated_minutes_watched   bigint      NOT NULL DEFAULT 0,
  average_view_duration_sec   int,
  average_view_percentage     numeric(6,3),             -- 0–100
  likes                       int         NOT NULL DEFAULT 0,
  comments                    int         NOT NULL DEFAULT 0,
  shares                      int         NOT NULL DEFAULT 0,
  subscribers_gained          int         NOT NULL DEFAULT 0,
  subscribers_lost            int         NOT NULL DEFAULT 0,
  estimated_revenue_usd       numeric(12,2),
  cpm_usd                     numeric(8,2),
  raw_payload                 jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (video_uuid, date)
);

CREATE INDEX IF NOT EXISTS youtube_video_analytics_date_idx
  ON public.connector_data_youtube_video_analytics (video_uuid, date DESC);

CREATE INDEX IF NOT EXISTS youtube_video_analytics_revenue_idx
  ON public.connector_data_youtube_video_analytics (estimated_revenue_usd DESC NULLS LAST);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'youtube_video_analytics_updated_at') THEN
    CREATE TRIGGER youtube_video_analytics_updated_at
      BEFORE UPDATE ON public.connector_data_youtube_video_analytics
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.connector_data_youtube_video_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "youtube_vid_analytics_select" ON public.connector_data_youtube_video_analytics;
CREATE POLICY "youtube_vid_analytics_select" ON public.connector_data_youtube_video_analytics
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "youtube_vid_analytics_write" ON public.connector_data_youtube_video_analytics;
CREATE POLICY "youtube_vid_analytics_write" ON public.connector_data_youtube_video_analytics
  FOR ALL USING (public.is_social_media_lead());

-- ─────────────────────────────────────────────────────────────
-- 3. youtube_oauth_states (CSRF/state token for OAuth flow)
--    Short-lived row holding the state token + return context so
--    the callback can validate and redirect back appropriately.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.youtube_oauth_states (
  state         text        PRIMARY KEY,
  startup_id    uuid        NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  initiated_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  return_path   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);

CREATE INDEX IF NOT EXISTS youtube_oauth_states_expires_idx
  ON public.youtube_oauth_states (expires_at);

ALTER TABLE public.youtube_oauth_states ENABLE ROW LEVEL SECURITY;

-- Sensitive: no client access at all (only service-role edge functions touch this)
DROP POLICY IF EXISTS "youtube_oauth_states_no_client" ON public.youtube_oauth_states;
CREATE POLICY "youtube_oauth_states_no_client" ON public.youtube_oauth_states
  FOR ALL USING (false);

-- ─────────────────────────────────────────────────────────────
-- 4. Realtime so analytics widgets refresh after a sync
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.connector_data_youtube_channel_analytics;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.connector_data_youtube_video_analytics;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
