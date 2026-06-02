-- ─────────────────────────────────────────────────────────────
-- Tier 2 audience + retention persistence layer
--
-- The youtube-analytics-sync function will be extended to fetch:
--   1. Demographics  (ageGroup × gender)
--   2. Geography     (country)
--   3. Traffic       (insightTrafficSourceType)
--   4. Device types
--   5. Per-video retention curves (elapsedVideoTimeRatio)
--
-- All five are reported by the YouTube Analytics API as aggregated for a
-- date range, not a daily time series. So each row is keyed by a
-- `period_end_date` representing the end of the rolling window. Re-syncing
-- on the same day overwrites the snapshot; the next day adds a fresh row,
-- giving us a longitudinal record without daily quota burn.
--
-- All tables follow the same access pattern as the existing analytics
-- tables: any authenticated user can SELECT; only the Social Media lead
-- (or service role) can write. Population happens via the sync function
-- using the service role key.
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- 1. Audience demographics
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.connector_data_youtube_demographics (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_uuid          uuid        NOT NULL REFERENCES public.connector_data_youtube_channels(id) ON DELETE CASCADE,
  period_end_date       date        NOT NULL,
  period_days           int         NOT NULL DEFAULT 30,
  age_group             text        NOT NULL,   -- "age13-17", "age18-24", "age25-34", etc.
  gender                text        NOT NULL,   -- "male" | "female" | "user_specified"
  viewer_percentage     numeric(6,3) NOT NULL,  -- 0–100
  raw_payload           jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_uuid, period_end_date, age_group, gender)
);

CREATE INDEX IF NOT EXISTS youtube_demographics_lookup_idx
  ON public.connector_data_youtube_demographics (channel_uuid, period_end_date DESC);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'youtube_demographics_updated_at') THEN
    CREATE TRIGGER youtube_demographics_updated_at
      BEFORE UPDATE ON public.connector_data_youtube_demographics
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.connector_data_youtube_demographics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "youtube_demographics_select" ON public.connector_data_youtube_demographics;
CREATE POLICY "youtube_demographics_select" ON public.connector_data_youtube_demographics
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "youtube_demographics_write" ON public.connector_data_youtube_demographics;
CREATE POLICY "youtube_demographics_write" ON public.connector_data_youtube_demographics
  FOR ALL USING (public.is_social_media_lead());


-- ─────────────────────────────────────────────────────────────
-- 2. Geography (views by country)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.connector_data_youtube_geography (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_uuid                uuid        NOT NULL REFERENCES public.connector_data_youtube_channels(id) ON DELETE CASCADE,
  period_end_date             date        NOT NULL,
  period_days                 int         NOT NULL DEFAULT 30,
  country_code                text        NOT NULL,   -- ISO 3166-1 alpha-2
  views                       bigint      NOT NULL DEFAULT 0,
  estimated_minutes_watched   bigint      NOT NULL DEFAULT 0,
  average_view_duration_sec   int,
  estimated_revenue_usd       numeric(12,2),          -- NULL if no monetary scope
  raw_payload                 jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_uuid, period_end_date, country_code)
);

CREATE INDEX IF NOT EXISTS youtube_geography_lookup_idx
  ON public.connector_data_youtube_geography (channel_uuid, period_end_date DESC, views DESC);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'youtube_geography_updated_at') THEN
    CREATE TRIGGER youtube_geography_updated_at
      BEFORE UPDATE ON public.connector_data_youtube_geography
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.connector_data_youtube_geography ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "youtube_geography_select" ON public.connector_data_youtube_geography;
CREATE POLICY "youtube_geography_select" ON public.connector_data_youtube_geography
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "youtube_geography_write" ON public.connector_data_youtube_geography;
CREATE POLICY "youtube_geography_write" ON public.connector_data_youtube_geography
  FOR ALL USING (public.is_social_media_lead());


-- ─────────────────────────────────────────────────────────────
-- 3. Traffic sources (where viewers came from)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.connector_data_youtube_traffic_sources (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_uuid                uuid        NOT NULL REFERENCES public.connector_data_youtube_channels(id) ON DELETE CASCADE,
  period_end_date             date        NOT NULL,
  period_days                 int         NOT NULL DEFAULT 30,
  source_type                 text        NOT NULL,   -- e.g. "YT_SEARCH","SUBSCRIBER","RELATED_VIDEO","EXT_URL"
  views                       bigint      NOT NULL DEFAULT 0,
  estimated_minutes_watched   bigint      NOT NULL DEFAULT 0,
  raw_payload                 jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_uuid, period_end_date, source_type)
);

CREATE INDEX IF NOT EXISTS youtube_traffic_sources_lookup_idx
  ON public.connector_data_youtube_traffic_sources (channel_uuid, period_end_date DESC, views DESC);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'youtube_traffic_sources_updated_at') THEN
    CREATE TRIGGER youtube_traffic_sources_updated_at
      BEFORE UPDATE ON public.connector_data_youtube_traffic_sources
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.connector_data_youtube_traffic_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "youtube_traffic_sources_select" ON public.connector_data_youtube_traffic_sources;
CREATE POLICY "youtube_traffic_sources_select" ON public.connector_data_youtube_traffic_sources
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "youtube_traffic_sources_write" ON public.connector_data_youtube_traffic_sources;
CREATE POLICY "youtube_traffic_sources_write" ON public.connector_data_youtube_traffic_sources
  FOR ALL USING (public.is_social_media_lead());


-- ─────────────────────────────────────────────────────────────
-- 4. Device types (mobile vs desktop vs TV etc.)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.connector_data_youtube_device_types (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_uuid                uuid        NOT NULL REFERENCES public.connector_data_youtube_channels(id) ON DELETE CASCADE,
  period_end_date             date        NOT NULL,
  period_days                 int         NOT NULL DEFAULT 30,
  device_type                 text        NOT NULL,   -- "MOBILE","DESKTOP","TABLET","TV","GAME_CONSOLE","UNKNOWN_PLATFORM"
  views                       bigint      NOT NULL DEFAULT 0,
  estimated_minutes_watched   bigint      NOT NULL DEFAULT 0,
  raw_payload                 jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_uuid, period_end_date, device_type)
);

CREATE INDEX IF NOT EXISTS youtube_device_types_lookup_idx
  ON public.connector_data_youtube_device_types (channel_uuid, period_end_date DESC);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'youtube_device_types_updated_at') THEN
    CREATE TRIGGER youtube_device_types_updated_at
      BEFORE UPDATE ON public.connector_data_youtube_device_types
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.connector_data_youtube_device_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "youtube_device_types_select" ON public.connector_data_youtube_device_types;
CREATE POLICY "youtube_device_types_select" ON public.connector_data_youtube_device_types
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "youtube_device_types_write" ON public.connector_data_youtube_device_types;
CREATE POLICY "youtube_device_types_write" ON public.connector_data_youtube_device_types
  FOR ALL USING (public.is_social_media_lead());


-- ─────────────────────────────────────────────────────────────
-- 5. Per-video audience retention curves
--    elapsed_video_time_ratio: 0.0–1.0 in 0.01 buckets (101 rows max)
--    audience_watch_ratio: what fraction of original audience is still watching
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.connector_data_youtube_video_retention (
  id                              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  video_uuid                      uuid        NOT NULL REFERENCES public.connector_data_youtube_videos(id) ON DELETE CASCADE,
  period_end_date                 date        NOT NULL,
  period_days                     int         NOT NULL DEFAULT 30,
  elapsed_video_time_ratio        numeric(5,4) NOT NULL,   -- 0.0000–1.0000
  audience_watch_ratio            numeric(6,4) NOT NULL,   -- relative to original audience at t=0
  relative_retention_performance  numeric(6,4),            -- vs comparable videos, may be NULL
  raw_payload                     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (video_uuid, period_end_date, elapsed_video_time_ratio)
);

CREATE INDEX IF NOT EXISTS youtube_video_retention_lookup_idx
  ON public.connector_data_youtube_video_retention (video_uuid, period_end_date DESC, elapsed_video_time_ratio);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'youtube_video_retention_updated_at') THEN
    CREATE TRIGGER youtube_video_retention_updated_at
      BEFORE UPDATE ON public.connector_data_youtube_video_retention
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.connector_data_youtube_video_retention ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "youtube_video_retention_select" ON public.connector_data_youtube_video_retention;
CREATE POLICY "youtube_video_retention_select" ON public.connector_data_youtube_video_retention
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "youtube_video_retention_write" ON public.connector_data_youtube_video_retention;
CREATE POLICY "youtube_video_retention_write" ON public.connector_data_youtube_video_retention
  FOR ALL USING (public.is_social_media_lead());
